//! ZVS - Zcash Verification Service
//!
//! A lightweight Zcash wallet service that connects to lightwalletd (a light client server)
//! to interact with the Zcash blockchain. This enables:
//! - Receiving shielded transactions and reading encrypted memos
//! - Sending shielded transactions with memos
//! - OTP-based verification flows (e.g., proving wallet ownership)
//!
//! ## Architecture
//!
//! ZVS uses `zcash_client_backend` which is the official Zcash SDK for building wallets.
//! Instead of running a full node, we connect to lightwalletd via gRPC which streams
//! compact blocks (blocks with only the data needed for wallet scanning).
//!
//! The wallet state is kept in-memory (`MemoryWalletDb`) which means it's ephemeral.
//! For production, you'd swap this for a persistent backend like SQLite.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::RwLock;
use tracing::info;

// zcash_client_backend is the official SDK for building Zcash light wallets.
// It provides high-level APIs for wallet operations.
use zcash_client_backend::{
    data_api::{
        // ChainState holds commitment tree state at a specific block height.
        // Required for creating valid transactions and tracking nullifiers.
        chain::ChainState,
        wallet::{
            // Two-phase transaction creation: first propose (calculate fees, select notes),
            // then create (sign and build the actual transaction).
            create_proposed_transactions,
            propose_standard_transfer_to_address,
            // Determines how many confirmations are required before funds are spendable.
            ConfirmationsPolicy,
            // Wrapper for spending keys used during transaction signing.
            SpendingKeys,
        },
        // Traits that define the wallet database interface - we import these to use
        // their methods on our MemoryWalletDb instance.
        Account as AccountTrait,
        AccountBirthday,
        AccountPurpose,
        WalletRead,
        WalletWrite,
    },
    // ZIP-317 is the modern fee standard for Zcash (replaced fixed 10000 zatoshi fee).
    fees::StandardFeeRule,
    // gRPC client for lightwalletd - the "compact tx streamer" protocol.
    proto::service::{compact_tx_streamer_client::CompactTxStreamerClient, BlockId, ChainSpec},
    // Controls which outgoing viewing key to use when encrypting the sender's copy of the memo.
    wallet::OvkPolicy,
};
use zcash_primitives::block::BlockHash;
// In-memory wallet storage - useful for testing/ephemeral services.
// For production persistence, use zcash_client_sqlite instead.
use zcash_client_memory::{MemBlockCache, MemoryWalletDb};
// The master spending key from which all Zcash keys are derived (ZIP-32 HD wallet).
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_primitives::transaction::TxId;
use zcash_protocol::{
    // MainNetwork vs TestNetwork determines address prefixes and consensus rules.
    consensus::{BlockHeight, MainNetwork},
    // Memos are 512-byte encrypted messages attached to shielded outputs.
    memo::MemoBytes,
    // Zatoshis is a type-safe wrapper for amounts (1 ZEC = 100,000,000 zatoshis).
    value::Zatoshis,
    // Zcash has two shielded protocols: Sapling (older, widely supported) and Orchard (newer).
    ShieldedProtocol,
};
// LocalTxProver loads Sapling proving parameters for creating zero-knowledge proofs.
// These params are ~50MB files downloaded on first use.
use zcash_proofs::prover::LocalTxProver;

/// Represents a decrypted memo received from the blockchain.
///
/// When scanning blocks, the wallet decrypts outputs addressed to us and extracts
/// the memo field. This struct captures that data for application use.
#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    /// Transaction ID (hex string) - unique identifier for the transaction
    pub txid: String,
    /// Block height where this transaction was mined
    pub height: u32,
    /// Amount received in zatoshis (1 ZEC = 100_000_000 zatoshis)
    pub amount: u64,
    /// Decrypted memo text (up to 512 bytes, often UTF-8 but can be arbitrary bytes)
    pub memo: String,
}

/// Stores a pending OTP (One-Time Password) for verification flows.
///
/// Use case: A user wants to prove they control a Zcash address. We generate an OTP,
/// they send a transaction with that OTP in the memo, and we verify it.
#[derive(Debug, Clone)]
pub struct OtpEntry {
    /// The code the user must send in a memo
    pub code: String,
    /// The Zcash address the user claims to own
    pub user_address: String,
    /// When the OTP was created - used for expiration (10 minute TTL)
    pub created_at: std::time::Instant,
}

/// ZVS - Zcash Verification Service
///
/// Main service struct that manages the wallet and lightwalletd connection.
/// Designed to be long-lived and handle multiple verification requests.
pub struct ZVS {
    /// gRPC client for communicating with lightwalletd.
    /// lightwalletd serves compact blocks and handles transaction broadcasting.
    client: CompactTxStreamerClient<tonic::transport::Channel>,

    /// In-memory wallet database wrapped in Arc<RwLock> for safe concurrent access.
    /// RwLock allows multiple readers OR one writer - important since sync() writes
    /// while balance()/get_address() only read.
    wallet: Arc<RwLock<MemoryWalletDb<MainNetwork>>>,

    /// Cache for compact blocks during sync. Blocks are fetched in batches and
    /// temporarily stored here while being processed by the wallet scanner.
    block_cache: MemBlockCache,

    /// The account ID for our single wallet account. Stored here to avoid
    /// repeated lookups via get_account_ids().first() on every operation.
    account_id: <MemoryWalletDb<MainNetwork> as WalletRead>::AccountId,

    /// The master spending key - derived from seed, used to sign transactions.
    /// This is the most sensitive piece of data; losing it means losing funds.
    usk: UnifiedSpendingKey,

    /// Sapling prover for creating zero-knowledge proofs. Optional because the
    /// parameters (~50MB) may not be downloaded yet. Lazily initialized on first send.
    prover: Option<LocalTxProver>,

    /// In-memory store of pending OTPs, keyed by session ID.
    pending_otps: HashMap<String, OtpEntry>,
}

impl ZVS {
    /// Connect to lightwalletd and initialize wallet from seed.
    ///
    /// This is the main constructor that sets up the entire wallet infrastructure:
    /// 1. Establishes gRPC connection to lightwalletd
    /// 2. Derives cryptographic keys from the seed
    /// 3. Sets up the wallet database with proper chain state
    ///
    /// # Arguments
    /// * `url` - lightwalletd gRPC endpoint (e.g., "https://mainnet.lightwalletd.com:9067")
    /// * `seed` - 32+ byte seed (typically derived from a BIP-39 mnemonic phrase)
    /// * `birthday_height` - Block height when wallet was created. Critical for performance:
    ///   blocks before this height are skipped during sync since they can't contain our funds.
    pub async fn connect(url: &str, seed: &[u8], birthday_height: u32) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        // Connect to lightwalletd via gRPC. The channel handles connection pooling,
        // reconnection, and HTTP/2 multiplexing automatically.
        let mut client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        // ZIP-32 HD wallet derivation: seed -> master key -> account keys.
        // AccountId::ZERO is the first account (index 0). Most wallets only use one account.
        let usk = UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)
            .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;

        // The UFVK (Unified Full Viewing Key) can view all incoming transactions
        // but cannot spend. We import this into the wallet for scanning.
        let ufvk = usk.to_unified_full_viewing_key();

        // Create in-memory wallet database. The "100" is the note filter retention limit -
        // how many blocks of "detected but not yet confirmed" notes to remember.
        let mut wallet = MemoryWalletDb::new(MainNetwork, 100);
        let block_cache = MemBlockCache::new();

        // AccountBirthday encapsulates the chain state (commitment tree roots) at the
        // block just before our wallet was created. This is essential because:
        // 1. We need the tree state to construct valid transactions (witnesses)
        // 2. We skip scanning all blocks before this height (major speedup)
        //
        // We fetch state at (birthday_height - 1) because the birthday is the first
        // block that *might* contain our transactions.
        let birthday = if birthday_height > 1 {
            let tree_state = client
                .get_tree_state(BlockId {
                    height: (birthday_height - 1) as u64,
                    hash: vec![], // Empty hash means "fetch by height"
                })
                .await
                .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
                .into_inner();

            // Parses the tree state protobuf into our AccountBirthday type.
            // The `None` is for an optional "recover until" height for rescans.
            AccountBirthday::from_treestate(tree_state, None)
                .map_err(|_| anyhow!("Failed to create birthday from tree state"))?
        } else {
            // Edge case: if birthday is at or near genesis, there's no prior state.
            // Use empty trees. This is mainly for testing.
            let chain_state = ChainState::empty(BlockHeight::from_u32(0), BlockHash([0; 32]));
            AccountBirthday::from_parts(chain_state, None)
        };

        // Import the account into the wallet database. This stores the viewing key
        // and birthday, enabling the wallet to scan blocks for our transactions.
        // - "ZVS Admin": human-readable account name
        // - AccountPurpose::Spending: this account can receive AND spend (vs view-only)
        // - derivation: None because we imported the UFVK directly, not derived it
        let account = wallet
            .import_account_ufvk(
                "ZVS Admin",
                &ufvk,
                &birthday,
                AccountPurpose::Spending { derivation: None },
                None, // No explicit address index
            )
            .map_err(|e| anyhow!("Failed to import account: {e:?}"))?;

        // Store the account ID so we don't need to query it on every operation
        let account_id = account.id();
        info!("Imported account: {:?}", account_id);

        // Attempt to load Sapling proving parameters from the default location
        // (~/.zcash-params on Unix). These are large (~50MB each) zk-SNARK
        // parameters needed to create transaction proofs. If not found, we'll
        // download them lazily when the first send() is attempted.
        let prover = LocalTxProver::with_default_location();
        if prover.is_none() {
            info!("Sapling parameters not found. Will download on first spend.");
        }

        Ok(Self {
            client,
            wallet: Arc::new(RwLock::new(wallet)),
            block_cache,
            account_id,
            usk,
            prover,
            pending_otps: HashMap::new(),
        })
    }

    /// Get the current blockchain height from lightwalletd.
    ///
    /// Useful for determining sync progress or displaying network status.
    pub async fn height(&mut self) -> Result<u32> {
        let response = self
            .client
            .get_latest_block(ChainSpec {}) // Empty ChainSpec = mainnet
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    /// Synchronize the wallet with the blockchain.
    ///
    /// This is the core operation that:
    /// 1. Fetches compact blocks from lightwalletd (blocks stripped to just outputs)
    /// 2. Trial-decrypts each output with our viewing key
    /// 3. Updates our note set with any received funds
    /// 4. Tracks nullifiers to detect when notes are spent
    ///
    /// Should be called periodically (e.g., every few seconds) to stay current.
    /// The sync is incremental - it only fetches blocks since the last sync.
    pub async fn sync(&mut self) -> Result<()> {
        info!("Starting sync...");

        // Acquire write lock since sync modifies wallet state (adds notes, updates heights)
        let mut wallet = self.wallet.write().await;

        // The sync::run function is the high-level sync orchestrator from zcash_client_backend.
        // Arguments:
        // - client: gRPC connection to lightwalletd
        // - MainNetwork: consensus parameters (affects address encoding, etc.)
        // - block_cache: temporary storage for fetched blocks
        // - wallet: the database to update
        // - 1000: batch size (number of blocks to process at once)
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

    /// Get the wallet's spendable balance in zatoshis.
    ///
    /// Returns only the Sapling balance (not Orchard) since we're using Sapling addresses.
    /// "Spendable" means confirmed and not already used in a pending transaction.
    pub async fn balance(&self) -> Result<u64> {
        // Read lock is sufficient - we're not modifying anything
        let wallet = self.wallet.read().await;

        // MIN confirmations = funds are spendable immediately after 1 confirmation.
        // More conservative apps might use ConfirmationsPolicy::new(10) or similar.
        let policy = ConfirmationsPolicy::MIN;
        let summary = wallet
            .get_wallet_summary(policy)
            .map_err(|e| anyhow!("Failed to get wallet summary: {e:?}"))?;

        // The wallet might have multiple accounts; we just take the first one's balance.
        if let Some(summary) = summary {
            for (_, balance) in summary.account_balances() {
                // Note: This only returns Sapling balance. If you're using Orchard,
                // you'd also add balance.orchard_balance().spendable_value().
                return Ok(balance.sapling_balance().spendable_value().into_u64());
            }
        }
        Ok(0)
    }

    /// Get all received memos since a given block height.
    ///
    /// Scans through all received notes and extracts their memos, filtering
    /// to only include notes received after `min_height`.
    pub async fn get_received_memos(&self, min_height: u32) -> Result<Vec<ReceivedMemo>> {
        let wallet = self.wallet.read().await;
        let min_height = BlockHeight::from_u32(min_height);

        let mut memos = Vec::new();

        let total_notes = wallet.get_received_notes().len();
        tracing::info!("Checking {} received notes (min_height: {})", total_notes, min_height);

        for note in wallet.get_received_notes().iter() {
            tracing::info!(
                "Note in tx {}: is_change={}, memo_type={:?}",
                note.txid,
                note.is_change,
                std::mem::discriminant(&note.memo)
            );

            // Skip change notes (these are our own change, not incoming payments)
            if note.is_change {
                tracing::debug!("Skipping change note in tx {}", note.txid);
                continue;
            }

            // Get the block height for this transaction
            let height = match wallet.get_tx_height(note.txid) {
                Ok(Some(h)) => h,
                _ => {
                    tracing::warn!("Could not get height for tx {}", note.txid);
                    continue;
                }
            };

            tracing::info!("Note at height {} (min_height: {})", height, min_height);

            // Filter by minimum height
            if height <= min_height {
                continue;
            }

            // Extract memo text - let's see ALL memo types
            let memo_text = match &note.memo {
                zcash_protocol::memo::Memo::Text(text) => {
                    let text_str = text.to_string();
                    tracing::info!("Found text memo in tx {}: '{}'", note.txid, text_str);
                    text_str
                },
                zcash_protocol::memo::Memo::Empty => {
                    tracing::info!("Empty memo in tx {} - memo bytes: {:?}", note.txid, note.memo);
                    continue;
                },
                zcash_protocol::memo::Memo::Arbitrary(bytes) => {
                    tracing::info!("Arbitrary memo in tx {}: {} bytes", note.txid, bytes.len());
                    // Try to decode as UTF-8
                    String::from_utf8_lossy(bytes.as_slice()).to_string()
                },
                _ => {
                    tracing::warn!("Unknown memo type in tx {}: {:?}", note.txid, note.memo);
                    continue;
                }
            };

            // Get the note value
            let amount = note.note.value().into_u64();

            memos.push(ReceivedMemo {
                txid: note.txid.to_string(),
                height: u32::from(height),
                amount,
                memo: memo_text,
            });
        }

        Ok(memos)
    }

    /// Send ZEC to a shielded address with an attached memo.
    ///
    /// This is a shielded (private) transaction where:
    /// - The sender, recipient, and amount are encrypted on-chain
    /// - The memo is only readable by the recipient (and sender if they keep the OVK)
    ///
    /// # Transaction Creation Flow
    /// 1. **Propose**: Select input notes, calculate fees (ZIP-317), plan change outputs
    /// 2. **Create**: Generate zero-knowledge proofs and sign the transaction
    /// 3. **Broadcast**: Submit the raw transaction bytes to the network
    pub async fn send(&mut self, to_address: &str, amount: u64, memo: &str) -> Result<TxId> {
        // Sapling proofs require large parameter files (~50MB). These are downloaded
        // once and cached in ~/.zcash-params. First send may be slow due to download.
        let prover = match &self.prover {
            Some(p) => p,
            None => {
                info!("Downloading Sapling parameters...");
                // Downloads spend.params and output.params from Zcash's servers
                zcash_proofs::download_sapling_parameters(None)
                    .map_err(|e| anyhow!("Failed to download parameters: {e}"))?;
                self.prover = LocalTxProver::with_default_location();
                self.prover
                    .as_ref()
                    .ok_or_else(|| anyhow!("Failed to load prover after download"))?
            }
        };

        // Type-safe amount conversion. This prevents accidental overflow/underflow.
        let amount = Zatoshis::from_u64(amount).map_err(|_| anyhow!("Invalid amount"))?;

        // Memos are exactly 512 bytes (padded with zeros if shorter). They're
        // encrypted alongside the output and only decryptable by the recipient.
        let memo_bytes = MemoBytes::from_bytes(memo.as_bytes())
            .map_err(|_| anyhow!("Memo too long (max 512 bytes)"))?;

        // Decode the recipient address. Supports unified addresses (u-prefix),
        // Sapling addresses (zs prefix), and transparent addresses (t prefix).
        let to = zcash_keys::address::Address::decode(&MainNetwork, to_address)
            .ok_or_else(|| anyhow!("Invalid recipient address"))?;

        let mut wallet = self.wallet.write().await;

        // PHASE 1: PROPOSAL
        // This doesn't create the transaction yet - it plans it out:
        // - Selects which notes (UTXOs) to spend
        // - Calculates the ZIP-317 fee based on tx size
        // - Determines change output amounts
        // The proposal can be inspected/approved before committing.
        let proposal = propose_standard_transfer_to_address::<_, _, zcash_client_memory::Error>(
            &mut *wallet,
            &MainNetwork,
            StandardFeeRule::Zip317, // Modern fee calculation based on tx size
            self.account_id,
            ConfirmationsPolicy::MIN, // Spend notes with minimal confirmations
            &to,
            amount,
            Some(memo_bytes),
            None,                      // No specific change address - use wallet default
            ShieldedProtocol::Sapling, // Use Sapling (not Orchard)
        )
        .map_err(|e| anyhow!("Failed to create proposal: {e:?}"))?;

        // PHASE 2: CREATION
        // Actually build and sign the transaction, generating zk-SNARK proofs.
        let spending_keys = SpendingKeys::new(self.usk.clone());

        // These type annotations help the compiler with the heavily generic
        // create_proposed_transactions function. In simpler cases they'd be inferred.
        use std::convert::Infallible;
        use zcash_client_backend::fees::ChangeError;
        use zcash_client_backend::wallet::NoteId;
        use zcash_primitives::transaction::fees::zip317::FeeError;

        let txids: nonempty::NonEmpty<TxId> = create_proposed_transactions::<
            _,                             // DbT: wallet database type (inferred)
            _,                             // ParamsT: network params (inferred)
            Infallible,                    // InputsErrT: we're using standard inputs
            _,                             // FeeRuleT: fee calculation (inferred)
            ChangeError<FeeError, NoteId>, // ChangeErrT: change calculation errors
            NoteId,                        // N: note identifier type
        >(
            &mut *wallet,
            &MainNetwork,
            prover, // Spend prover (creates proofs for spending notes)
            prover, // Output prover (creates proofs for new outputs)
            &spending_keys,
            // OvkPolicy::Sender means the sender can decrypt their own outgoing
            // transactions later (using their outgoing viewing key). This is
            // useful for wallet UX but technically reduces privacy slightly.
            OvkPolicy::Sender,
            &proposal,
        )
        .map_err(|_| anyhow!("Failed to create transaction"))?;

        let txid = txids.first().clone();
        info!("Created transaction: {}", txid);

        // Retrieve the raw transaction bytes for broadcasting
        let tx = wallet
            .get_transaction(txid)
            .map_err(|e| anyhow!("Failed to get transaction: {e:?}"))?
            .ok_or_else(|| anyhow!("Transaction not found in wallet"))?;

        let mut tx_bytes = Vec::new();
        tx.write(&mut tx_bytes)
            .map_err(|e| anyhow!("Failed to serialize transaction: {e}"))?;

        // Release the wallet lock before the network call to avoid blocking
        // other operations (like balance queries) during broadcast
        drop(wallet);

        // PHASE 3: BROADCAST
        self.broadcast_transaction(tx_bytes).await?;

        Ok(txid)
    }

    /// Submit a signed transaction to the Zcash network via lightwalletd.
    ///
    /// The transaction is relayed to zcashd nodes which validate it and
    /// propagate it through the network. If accepted, it will be mined
    /// into a block (typically within 75 seconds on mainnet).
    async fn broadcast_transaction(&mut self, tx_bytes: Vec<u8>) -> Result<()> {
        use zcash_client_backend::proto::service::RawTransaction;

        let response = self
            .client
            .send_transaction(RawTransaction {
                data: tx_bytes,
                height: 0, // 0 means "current height" - lightwalletd fills this in
            })
            .await
            .map_err(|e| anyhow!("Failed to broadcast: {e}"))?;

        // Check for errors (e.g., double-spend, invalid proof, insufficient fee)
        let result = response.into_inner();
        if result.error_code != 0 {
            return Err(anyhow!("Broadcast failed: {}", result.error_message));
        }

        info!("Transaction broadcast successfully");
        Ok(())
    }

    /// Generate a random 6-digit OTP for address verification.
    ///
    /// Verification flow:
    /// 1. Client requests verification for their Zcash address
    /// 2. Server generates OTP and tells client to send it in a memo
    /// 3. Client sends a small transaction with the OTP in the memo
    /// 4. Server scans blockchain, finds memo, calls verify_otp()
    ///
    /// This proves the client controls the private key for that address,
    /// since only they can create a transaction from it.
    ///
    /// # Arguments
    /// * `session_id` - Unique identifier for this verification session
    /// * `user_address` - The Zcash address the user claims to own
    pub fn generate_otp(&mut self, session_id: &str, user_address: &str) -> String {
        use rand::Rng;
        // 6 digits: 100000-999999 (never starts with 0, always 6 chars)
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

    /// Verify an OTP code against a pending verification session.
    ///
    /// Returns true if:
    /// - The session exists
    /// - The OTP hasn't expired (10 minute TTL)
    /// - The code matches
    ///
    /// Successful verification consumes the OTP (can't be reused).
    /// Expired OTPs are cleaned up lazily when checked.
    pub fn verify_otp(&mut self, session_id: &str, code: &str) -> bool {
        if let Some(entry) = self.pending_otps.get(session_id) {
            // 10 minute expiration window
            if entry.created_at.elapsed().as_secs() > 600 {
                self.pending_otps.remove(session_id);
                return false;
            }
            if entry.code == code {
                // Consume the OTP on successful verification
                self.pending_otps.remove(session_id);
                return true;
            }
        }
        false
    }

    /// Debug function to inspect wallet state and received notes
    pub async fn debug_wallet_state(&self) -> Result<()> {
        let wallet = self.wallet.read().await;

        tracing::info!("=== Wallet Debug Info ===");
        tracing::info!("Account ID: {:?}", self.account_id);

        let notes = wallet.get_received_notes();
        tracing::info!("Total received notes: {}", notes.len());

        for (i, note) in notes.iter().enumerate() {
            tracing::info!(
                "Note {}: txid={}, is_change={}, value={}, memo_len={:?}",
                i,
                note.txid,
                note.is_change,
                note.note.value().into_u64(),
                match &note.memo {
                    zcash_protocol::memo::Memo::Empty => "Empty".to_string(),
                    zcash_protocol::memo::Memo::Text(t) => format!("Text({})", t.len()),
                    zcash_protocol::memo::Memo::Arbitrary(b) => format!("Arbitrary({})", b.len()),
                    _ => "Other".to_string(),
                }
            );

            // Try to access the raw memo bytes
            tracing::info!("  Memo content: {:?}", note.memo);
        }

        Ok(())
    }

    /// Get the wallet's default Sapling receiving address.
    ///
    /// Returns a "zs1..." address that can receive shielded transactions.
    /// This is derived deterministically from the seed, so it's the same
    /// address every time for the same wallet.
    ///
    /// Note: In production, you might want to generate multiple addresses
    /// for privacy (each transaction could use a fresh diversified address).
    pub async fn get_address(&self) -> Result<String> {
        let wallet = self.wallet.read().await;

        let account = wallet
            .get_account(self.account_id)
            .map_err(|e| anyhow!("Failed to get account: {e:?}"))?
            .ok_or_else(|| anyhow!("Account not found"))?;

        // Get the Unified Full Viewing Key
        let ufvk = account
            .ufvk()
            .ok_or_else(|| anyhow!("No UFVK for account"))?;

        // Extract the Sapling component. UFVKs can contain keys for multiple
        // protocols (transparent, Sapling, Orchard) - we want just Sapling.
        let sapling_dfvk = ufvk.sapling().ok_or_else(|| anyhow!("No Sapling key"))?;

        // default_address() returns the diversifier index and address.
        // The default diversifier is all zeros, giving a consistent address.
        let (_, address) = sapling_dfvk.default_address();

        // Encode as a human-readable Bech32 string (zs1...)
        // HRP = Human Readable Part, identifies this as a mainnet Sapling address
        Ok(zcash_keys::encoding::encode_payment_address(
            zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
            &address,
        ))
    }

}
