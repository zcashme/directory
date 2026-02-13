//! ZVS - Zcash Verification Service
//!
//! Connects to lightwalletd, detects incoming memos, and can send transactions.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::RwLock;
use tracing::info;

use zcash_client_backend::{
    data_api::{
        chain::ChainState,
        wallet::{
            create_proposed_transactions, propose_standard_transfer_to_address,
            ConfirmationsPolicy, SpendingKeys,
        },
        Account as AccountTrait, AccountBirthday, AccountPurpose, WalletRead, WalletWrite,
    },
    fees::StandardFeeRule,
    proto::service::{compact_tx_streamer_client::CompactTxStreamerClient, BlockId, ChainSpec},
    wallet::OvkPolicy,
};
use zcash_primitives::block::BlockHash;
use zcash_client_memory::{MemBlockCache, MemoryWalletDb};
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_primitives::transaction::TxId;
use zcash_protocol::{
    consensus::{BlockHeight, MainNetwork},
    memo::MemoBytes,
    value::Zatoshis,
    ShieldedProtocol,
};
use zcash_proofs::prover::LocalTxProver;

/// Decrypted memo from blockchain
#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid: String,
    pub height: u32,
    pub amount: u64,
    pub memo: String,
}

/// OTP entry for verification
#[derive(Debug, Clone)]
pub struct OtpEntry {
    pub code: String,
    pub user_address: String,
    pub created_at: std::time::Instant,
}

/// ZVS - Zcash Verification Service
pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    wallet: Arc<RwLock<MemoryWalletDb<MainNetwork>>>,
    block_cache: MemBlockCache,
    usk: UnifiedSpendingKey,
    prover: Option<LocalTxProver>,
    pending_otps: HashMap<String, OtpEntry>,
}

impl ZVS {
    /// Connect to lightwalletd and initialize wallet from seed
    ///
    /// # Arguments
    /// * `url` - lightwalletd gRPC endpoint (e.g., "https://mainnet.lightwalletd.com:9067")
    /// * `seed` - 32+ byte seed (from mnemonic)
    /// * `birthday_height` - Block height when wallet was created (for efficient scanning)
    pub async fn connect(url: &str, seed: &[u8], birthday_height: u32) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        // Connect to lightwalletd
        let mut client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        // Derive spending key from seed
        let usk = UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)
            .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;

        // Get the full viewing key
        let ufvk = usk.to_unified_full_viewing_key();

        // Create in-memory wallet
        let mut wallet = MemoryWalletDb::new(MainNetwork, 100);
        let block_cache = MemBlockCache::new();

        // Fetch tree state from lightwalletd at birthday height - 1
        let birthday = if birthday_height > 1 {
            let tree_state = client
                .get_tree_state(BlockId {
                    height: (birthday_height - 1) as u64,
                    hash: vec![],
                })
                .await
                .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
                .into_inner();

            AccountBirthday::from_treestate(tree_state, None)
                .map_err(|_| anyhow!("Failed to create birthday from tree state"))?
        } else {
            // For very early blocks, use empty chain state
            let chain_state = ChainState::empty(
                BlockHeight::from_u32(0),
                BlockHash([0; 32]),
            );
            AccountBirthday::from_parts(chain_state, None)
        };

        // Import account with the UFVK
        let account = wallet
            .import_account_ufvk(
                "ZVS Admin",
                &ufvk,
                &birthday,
                AccountPurpose::Spending { derivation: None },
                None,
            )
            .map_err(|e| anyhow!("Failed to import account: {e:?}"))?;

        info!("Imported account: {:?}", account.id());

        // Try to load prover (Sapling parameters)
        let prover = LocalTxProver::with_default_location();
        if prover.is_none() {
            info!("Sapling parameters not found. Will download on first spend.");
        }

        Ok(Self {
            client,
            wallet: Arc::new(RwLock::new(wallet)),
            block_cache,
            usk,
            prover,
            pending_otps: HashMap::new(),
        })
    }

    /// Get current chain height
    pub async fn height(&mut self) -> Result<u32> {
        let response = self
            .client
            .get_latest_block(ChainSpec {})
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    /// Sync wallet with the blockchain
    pub async fn sync(&mut self) -> Result<()> {
        info!("Starting sync...");

        let mut wallet = self.wallet.write().await;

        zcash_client_backend::sync::run(
            &mut self.client,
            &MainNetwork,
            &self.block_cache,
            &mut *wallet,
            1000,
        )
        .await
        .map_err(|e| anyhow!("Sync failed: {e:?}"))?;

        info!("Sync complete");
        Ok(())
    }

    /// Get wallet balance (in zatoshis)
    pub async fn balance(&self) -> Result<u64> {
        let wallet = self.wallet.read().await;
        let policy = ConfirmationsPolicy::MIN;
        let summary = wallet
            .get_wallet_summary(policy)
            .map_err(|e| anyhow!("Failed to get wallet summary: {e:?}"))?;

        if let Some(summary) = summary {
            for (_, balance) in summary.account_balances() {
                return Ok(balance.sapling_balance().spendable_value().into_u64());
            }
        }
        Ok(0)
    }

    /// Send ZEC with a memo
    pub async fn send(&mut self, to_address: &str, amount: u64, memo: &str) -> Result<TxId> {
        // Ensure prover is available
        let prover = match &self.prover {
            Some(p) => p,
            None => {
                info!("Downloading Sapling parameters...");
                zcash_proofs::download_sapling_parameters(None)
                    .map_err(|e| anyhow!("Failed to download parameters: {e}"))?;
                self.prover = LocalTxProver::with_default_location();
                self.prover
                    .as_ref()
                    .ok_or_else(|| anyhow!("Failed to load prover after download"))?
            }
        };

        let amount = Zatoshis::from_u64(amount).map_err(|_| anyhow!("Invalid amount"))?;

        let memo_bytes = MemoBytes::from_bytes(memo.as_bytes())
            .map_err(|_| anyhow!("Memo too long (max 512 bytes)"))?;

        let to = zcash_keys::address::Address::decode(&MainNetwork, to_address)
            .ok_or_else(|| anyhow!("Invalid recipient address"))?;

        let mut wallet = self.wallet.write().await;

        // Get account ID
        let account_ids = wallet
            .get_account_ids()
            .map_err(|e| anyhow!("Failed to get accounts: {e:?}"))?;
        let account_id = account_ids
            .first()
            .ok_or_else(|| anyhow!("No accounts in wallet"))?;

        // Create transaction proposal
        let proposal = propose_standard_transfer_to_address::<_, _, zcash_client_memory::Error>(
            &mut *wallet,
            &MainNetwork,
            StandardFeeRule::Zip317,
            *account_id,
            ConfirmationsPolicy::MIN,
            &to,
            amount,
            Some(memo_bytes),
            None,
            ShieldedProtocol::Sapling,
        )
        .map_err(|e| anyhow!("Failed to create proposal: {e:?}"))?;

        // Sign and create transaction
        let spending_keys = SpendingKeys::new(self.usk.clone());

        // Explicitly specify type parameters to help inference
        use std::convert::Infallible;
        use zcash_client_backend::wallet::NoteId;
        use zcash_primitives::transaction::fees::zip317::FeeError;
        use zcash_client_backend::fees::ChangeError;

        let txids: nonempty::NonEmpty<TxId> = create_proposed_transactions::<
            _,                           // DbT
            _,                           // ParamsT
            Infallible,                  // InputsErrT
            _,                           // FeeRuleT
            ChangeError<FeeError, NoteId>, // ChangeErrT
            NoteId,                      // N
        >(
            &mut *wallet,
            &MainNetwork,
            prover,
            prover,
            &spending_keys,
            OvkPolicy::Sender,
            &proposal,
        )
        .map_err(|_| anyhow!("Failed to create transaction"))?;

        let txid = txids.first().clone();
        info!("Created transaction: {}", txid);

        // Get transaction bytes before dropping wallet lock
        let tx = wallet
            .get_transaction(txid)
            .map_err(|e| anyhow!("Failed to get transaction: {e:?}"))?
            .ok_or_else(|| anyhow!("Transaction not found in wallet"))?;

        let mut tx_bytes = Vec::new();
        tx.write(&mut tx_bytes)
            .map_err(|e| anyhow!("Failed to serialize transaction: {e}"))?;

        // Drop wallet lock
        drop(wallet);

        // Broadcast transaction
        self.broadcast_transaction(tx_bytes).await?;

        Ok(txid)
    }

    /// Broadcast a transaction to the network
    async fn broadcast_transaction(&mut self, tx_bytes: Vec<u8>) -> Result<()> {
        use zcash_client_backend::proto::service::RawTransaction;

        let response = self
            .client
            .send_transaction(RawTransaction {
                data: tx_bytes,
                height: 0,
            })
            .await
            .map_err(|e| anyhow!("Failed to broadcast: {e}"))?;

        let result = response.into_inner();
        if result.error_code != 0 {
            return Err(anyhow!("Broadcast failed: {}", result.error_message));
        }

        info!("Transaction broadcast successfully");
        Ok(())
    }

    /// Generate a random 6-digit OTP
    pub fn generate_otp(&mut self, session_id: &str, user_address: &str) -> String {
        use rand::Rng;
        let code: u32 = rand::thread_rng().gen_range(100000..999999);
        let code_str = code.to_string();

        self.pending_otps.insert(
            session_id.to_string(),
            OtpEntry {
                code: code_str.clone(),
                user_address: user_address.to_string(),
                created_at: std::time::Instant::now(),
            },
        );

        code_str
    }

    /// Verify an OTP
    pub fn verify_otp(&mut self, session_id: &str, code: &str) -> bool {
        if let Some(entry) = self.pending_otps.get(session_id) {
            if entry.created_at.elapsed().as_secs() > 600 {
                self.pending_otps.remove(session_id);
                return false;
            }
            if entry.code == code {
                self.pending_otps.remove(session_id);
                return true;
            }
        }
        false
    }

    /// Get the wallet's receiving address
    pub async fn get_address(&self) -> Result<String> {
        let wallet = self.wallet.read().await;

        let account_ids = wallet
            .get_account_ids()
            .map_err(|e| anyhow!("Failed to get accounts: {e:?}"))?;
        let account_id = account_ids
            .first()
            .ok_or_else(|| anyhow!("No accounts in wallet"))?;

        let account = wallet
            .get_account(*account_id)
            .map_err(|e| anyhow!("Failed to get account: {e:?}"))?
            .ok_or_else(|| anyhow!("Account not found"))?;

        let ufvk = account
            .ufvk()
            .ok_or_else(|| anyhow!("No UFVK for account"))?;

        let sapling_dfvk = ufvk.sapling().ok_or_else(|| anyhow!("No Sapling key"))?;

        let (_, address) = sapling_dfvk.default_address();

        Ok(zcash_keys::encoding::encode_payment_address(
            zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
            &address,
        ))
    }
}
