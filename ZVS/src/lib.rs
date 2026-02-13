use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::RwLock;
use tracing::info;

use zcash_client_backend::{
    data_api::{
        chain::ChainState,
        Account as AccountTrait,
        AccountBirthday,
        AccountPurpose,
        WalletRead,
        WalletWrite,
    },
    proto::service::{compact_tx_streamer_client::CompactTxStreamerClient, BlockId, ChainSpec},
};
use zcash_primitives::block::BlockHash;
use zcash_client_sqlite::{WalletDb, util::SystemClock};
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_protocol::consensus::{BlockHeight, MainNetwork};

#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid: String,
    pub height: u32,
    pub amount: u64,
    pub memo: String,
}

#[derive(Debug, Clone)]
pub struct OtpEntry {
    pub code: String,
    pub user_address: String,
    pub created_at: std::time::Instant,
}

pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    wallet: Arc<RwLock<WalletDb<rusqlite::Connection, MainNetwork, SystemClock, rand::rngs::OsRng>>>,
    account_id: <WalletDb<rusqlite::Connection, MainNetwork, SystemClock, rand::rngs::OsRng> as WalletRead>::AccountId,
    usk: UnifiedSpendingKey,
    pending_otps: HashMap<String, OtpEntry>,
}

impl ZVS {
    pub async fn connect(url: &str, seed: &[u8], birthday_height: u32) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let mut client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        let usk = UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)
            .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;

        let ufvk = usk.to_unified_full_viewing_key();

        let db_path = std::path::PathBuf::from("./zvs_wallet.db");
        let mut wallet = WalletDb::for_path(db_path, MainNetwork, SystemClock, rand::rngs::OsRng)?;

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
            let chain_state = ChainState::empty(BlockHeight::from_u32(0), BlockHash([0; 32]));
            AccountBirthday::from_parts(chain_state, None)
        };

        let account = wallet
            .import_account_ufvk(
                "ZVS Admin",
                &ufvk,
                &birthday,
                AccountPurpose::Spending { derivation: None },
                None,
            )
            .map_err(|e| anyhow!("Failed to import account: {e:?}"))?;

        let account_id = account.id();
        info!("Imported account: {:?}", account_id);

        Ok(Self {
            client,
            wallet: Arc::new(RwLock::new(wallet)),
            account_id,
            usk,
            pending_otps: HashMap::new(),
        })
    }

    pub async fn height(&mut self) -> Result<u32> {
        let response = self
            .client
            .get_latest_block(ChainSpec {})
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    pub async fn get_address(&self) -> Result<String> {
        let wallet = self.wallet.read().await;

        let account = wallet
            .get_account(self.account_id)
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
}
