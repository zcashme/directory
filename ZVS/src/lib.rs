use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{anyhow, Result};
use rusqlite::Connection;
use secrecy::Secret;
use tracing::{debug, error, info};

use zcash_client_backend::{
    data_api::{
        chain::{scan_cached_blocks, BlockSource, ChainState},
        wallet::ConfirmationsPolicy,
        AccountBirthday, WalletRead, WalletWrite,
    },
    proto::{
        compact_formats::CompactBlock,
        service::{
            compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec,
        },
    },
};
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_client_sqlite::{
    util::SystemClock,
    wallet::init::init_wallet_db,
    AccountUuid, WalletDb,
};
use zcash_protocol::consensus::{BlockHeight, MainNetwork};

pub mod memo_rules;
pub use memo_rules::{validate_memo, VerificationData};

/// In-memory block cache that implements BlockSource
pub struct MemoryBlockSource {
    blocks: BTreeMap<u32, CompactBlock>,
}

impl MemoryBlockSource {
    pub fn new() -> Self {
        Self {
            blocks: BTreeMap::new(),
        }
    }

    pub fn insert(&mut self, height: u32, block: CompactBlock) {
        self.blocks.insert(height, block);
    }

    pub fn len(&self) -> usize {
        self.blocks.len()
    }

    pub fn is_empty(&self) -> bool {
        self.blocks.is_empty()
    }
}

impl Default for MemoryBlockSource {
    fn default() -> Self {
        Self::new()
    }
}

impl BlockSource for MemoryBlockSource {
    type Error = anyhow::Error;

    fn with_blocks<F, DbErrT>(
        &self,
        from_height: Option<BlockHeight>,
        limit: Option<usize>,
        mut with_row: F,
    ) -> std::result::Result<
        (),
        zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>,
    >
    where
        F: FnMut(
            CompactBlock,
        ) -> std::result::Result<
            (),
            zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>,
        >,
    {
        let start = from_height.map(u32::from).unwrap_or(0);
        let mut count = 0;

        for (_, block) in self.blocks.range(start..) {
            if let Some(l) = limit {
                if count >= l {
                    break;
                }
            }
            with_row(block.clone())?;
            count += 1;
        }

        Ok(())
    }
}

/// Received memo from a scanned transaction
#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid_hex: String,
    pub height: u32,
    pub memo: String,
    pub value_zats: u64,
    /// Parsed verification data if memo matches ZVS format
    pub verification: Option<VerificationData>,
}

/// Result of a sync/scan operation
#[derive(Debug, Clone, Default)]
pub struct ScanResult {
    pub blocks_scanned: u32,
    pub sapling_notes_received: usize,
    pub orchard_notes_received: usize,
    pub new_memos: Vec<ReceivedMemo>,
}

/// Event emitted during monitoring
#[derive(Debug, Clone)]
pub enum MonitorEvent {
    /// New block detected
    NewBlock { height: u32 },
    /// Sync progress update
    SyncProgress { current: u32, target: u32 },
    /// New memo received that matches ZVS format
    VerificationRequest(ReceivedMemo),
    /// Any memo received
    MemoReceived(ReceivedMemo),
    /// Error during monitoring
    Error(String),
}

/// Account balance summary
#[derive(Debug, Clone)]
pub struct AccountBalance {
    pub total: u64,
    pub sapling_spendable: u64,
    pub orchard_spendable: u64,
}

// Use the SystemClock from zcash_client_sqlite
type WalletDbType = WalletDb<rusqlite::Connection, MainNetwork, SystemClock, rand::rngs::OsRng>;

pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    wallet: WalletDbType,
    account_id: AccountUuid,
    usk: UnifiedSpendingKey,
    birthday_height: u32,
    db_path: PathBuf,
    /// Track the last processed note ID to detect new notes
    last_processed_note_id: i64,
}

impl ZVS {
    /// Connect to lightwalletd and initialize wallet
    pub async fn connect(
        url: &str,
        seed: &[u8],
        birthday_height: u32,
        data_dir: &Path,
    ) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let mut client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        std::fs::create_dir_all(data_dir)?;
        let db_path = data_dir.join("wallet.db");

        info!("Initializing wallet at {}", db_path.display());

        // Initialize WalletDb with clock and rng
        let mut wallet = WalletDb::for_path(
            &db_path,
            MainNetwork,
            SystemClock,
            rand::rngs::OsRng,
        )
        .map_err(|e| anyhow!("Failed to open wallet db: {e}"))?;

        // Run migrations
        init_wallet_db(&mut wallet, None)
            .map_err(|e| anyhow!("Failed to initialize wallet db: {e:?}"))?;

        // Check if account already exists
        let accounts = wallet
            .get_account_ids()
            .map_err(|e| anyhow!("Failed to get accounts: {e}"))?;

        let (account_id, usk) = if let Some(existing_id) = accounts.first() {
            info!("Using existing account");
            // Re-derive USK from seed for the existing account
            let usk = zcash_keys::keys::UnifiedSpendingKey::from_seed(
                &MainNetwork,
                seed,
                zip32::AccountId::ZERO,
            )
            .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;
            (*existing_id, usk)
        } else {
            info!("Creating new account from seed");

            // Get tree state for birthday
            let birthday = Self::fetch_birthday(&mut client, birthday_height).await?;

            // Create account using seed bytes wrapped in Secret
            let seed_secret: Secret<Vec<u8>> = Secret::new(seed.to_vec());

            let (account_id, usk) = wallet
                .create_account("ZVS Admin", &seed_secret, &birthday, None)
                .map_err(|e| anyhow!("Failed to create account: {e}"))?;

            info!("Created account: {:?}", account_id);
            (account_id, usk)
        };

        // Log Sapling address
        let ufvk = usk.to_unified_full_viewing_key();
        if let Some(sapling_dfvk) = ufvk.sapling() {
            let (_, address) = sapling_dfvk.default_address();
            let encoded = zcash_client_backend::encoding::encode_payment_address(
                zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
                &address,
            );
            info!("Sapling address: {}", encoded);
        }

        // Get initial note count
        let last_note_id = Self::get_max_note_id(&db_path).unwrap_or(0);

        Ok(Self {
            client,
            wallet,
            account_id,
            usk,
            birthday_height,
            db_path,
            last_processed_note_id: last_note_id,
        })
    }

    /// Fetch account birthday from lightwalletd
    async fn fetch_birthday(
        client: &mut CompactTxStreamerClient<tonic::transport::Channel>,
        height: u32,
    ) -> Result<AccountBirthday> {
        let prior_height = height.saturating_sub(1);
        info!("Fetching tree state at height {}", prior_height);

        let tree_state = client
            .get_tree_state(BlockId {
                height: prior_height as u64,
                hash: vec![],
            })
            .await
            .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
            .into_inner();

        AccountBirthday::from_treestate(tree_state, None)
            .map_err(|_| anyhow!("Failed to create birthday from tree state"))
    }

    /// Get the latest block height from lightwalletd
    pub async fn get_latest_height(&mut self) -> Result<u32> {
        let response = self
            .client
            .get_latest_block(ChainSpec {})
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    /// Sync wallet: download blocks and scan for transactions
    pub async fn sync(&mut self) -> Result<()> {
        let chain_tip = self.get_latest_height().await?;

        let scan_from = self
            .wallet
            .block_fully_scanned()
            .map_err(|e| anyhow!("Failed to get scan progress: {e}"))?
            .map(|meta| u32::from(meta.block_height()) + 1)
            .unwrap_or(self.birthday_height);

        if scan_from > chain_tip {
            info!("Wallet is up to date (tip: {})", chain_tip);
            return Ok(());
        }

        info!("Syncing from block {} to {}", scan_from, chain_tip);

        const BATCH_SIZE: u32 = 1000;
        let mut current = scan_from;

        while current <= chain_tip {
            let batch_end = std::cmp::min(current + BATCH_SIZE - 1, chain_tip);
            info!("Downloading blocks {} to {}", current, batch_end);

            let mut block_source = MemoryBlockSource::new();

            let block_range = BlockRange {
                start: Some(BlockId {
                    height: current as u64,
                    hash: vec![],
                }),
                end: Some(BlockId {
                    height: batch_end as u64,
                    hash: vec![],
                }),
            };

            let mut stream = self
                .client
                .get_block_range(block_range)
                .await
                .map_err(|e| anyhow!("Failed to get block range: {e}"))?
                .into_inner();

            use tokio_stream::StreamExt;
            while let Some(block) = stream.next().await {
                let block = block.map_err(|e| anyhow!("Stream error: {e}"))?;
                let height = block.height as u32;
                block_source.insert(height, block);
            }

            info!("Downloaded {} blocks, scanning...", block_source.len());

            // Get chain state for this batch
            let from_height = BlockHeight::from_u32(current);
            let chain_state = self.get_chain_state_at(current.saturating_sub(1)).await?;

            // Scan the blocks
            let scan_result = scan_cached_blocks(
                &MainNetwork,
                &block_source,
                &mut self.wallet,
                from_height,
                &chain_state,
                block_source.len(),
            )
            .map_err(|e| anyhow!("Scan error: {e}"))?;

            info!(
                "Scanned batch: {} sapling, {} orchard notes received",
                scan_result.received_sapling_note_count(),
                scan_result.received_orchard_note_count()
            );

            current = batch_end + 1;
        }

        info!("Sync complete up to block {}", chain_tip);
        Ok(())
    }

    /// Get chain state at a specific height
    async fn get_chain_state_at(&mut self, height: u32) -> Result<ChainState> {
        let tree_state = self
            .client
            .get_tree_state(BlockId {
                height: height as u64,
                hash: vec![],
            })
            .await
            .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
            .into_inner();

        // Use AccountBirthday's chain_state method to get properly parsed chain state
        let birthday = AccountBirthday::from_treestate(tree_state, None)
            .map_err(|_| anyhow!("Failed to parse tree state"))?;

        Ok(birthday.prior_chain_state().clone())
    }

    /// Get account balance
    pub fn get_balance(&self) -> Result<AccountBalance> {
        let summary = self
            .wallet
            .get_wallet_summary(ConfirmationsPolicy::default())
            .map_err(|e| anyhow!("Failed to get wallet summary: {e}"))?
            .ok_or_else(|| anyhow!("Wallet not synced - no summary available"))?;

        let balance = summary
            .account_balances()
            .get(&self.account_id)
            .ok_or_else(|| anyhow!("Account not found in wallet"))?;

        Ok(AccountBalance {
            total: u64::from(balance.total()),
            sapling_spendable: u64::from(balance.sapling_balance().spendable_value()),
            orchard_spendable: u64::from(balance.orchard_balance().spendable_value()),
        })
    }

    /// Get the Sapling payment address for receiving (legacy, prefer get_unified_address)
    pub fn get_sapling_address(&self) -> Result<String> {
        let ufvk = self.usk.to_unified_full_viewing_key();
        let sapling_dfvk = ufvk
            .sapling()
            .ok_or_else(|| anyhow!("No Sapling key in UFVK"))?;
        let (_, address) = sapling_dfvk.default_address();
        Ok(zcash_client_backend::encoding::encode_payment_address(
            zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
            &address,
        ))
    }

    /// Get the primary receiving address (Sapling for now)
    pub fn get_address(&self) -> Result<String> {
        self.get_sapling_address()
    }

    /// Send ZEC with an OTP memo to a recipient
    /// This is a placeholder - full implementation requires setting up transaction building
    pub async fn send_otp(
        &mut self,
        _recipient_address: &str,
        _amount_zats: u64,
        _otp: &str,
    ) -> Result<String> {
        // TODO: Implement transaction sending
        // This requires:
        // 1. Input selection with GreedyInputSelector
        // 2. Change strategy with SingleOutputChangeStrategy
        // 3. propose_transfer to create proposal
        // 4. LocalTxProver for proving
        // 5. create_proposed_transactions to build tx
        // 6. Broadcast via lightwalletd

        Err(anyhow!("send_otp not yet fully implemented"))
    }

    /// Get max note ID from the database
    fn get_max_note_id(db_path: &Path) -> Result<i64> {
        let conn = Connection::open_with_flags(
            db_path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        ).map_err(|e| anyhow!("Failed to open db for reading: {e}"))?;

        let max_id: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(id), 0) FROM sapling_received_notes",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(max_id)
    }

    /// Sync wallet incrementally and return scan results with memos
    pub async fn sync_incremental(&mut self) -> Result<ScanResult> {
        let chain_tip = self.get_latest_height().await?;

        let scan_from = self
            .wallet
            .block_fully_scanned()
            .map_err(|e| anyhow!("Failed to get scan progress: {e}"))?
            .map(|meta| u32::from(meta.block_height()) + 1)
            .unwrap_or(self.birthday_height);

        if scan_from > chain_tip {
            debug!("Wallet is up to date (tip: {})", chain_tip);
            return Ok(ScanResult::default());
        }

        let blocks_to_scan = chain_tip - scan_from + 1;
        info!("Syncing {} blocks: {} to {}", blocks_to_scan, scan_from, chain_tip);

        const BATCH_SIZE: u32 = 1000;
        let mut current = scan_from;
        let mut total_sapling = 0usize;
        let mut total_orchard = 0usize;

        while current <= chain_tip {
            let batch_end = std::cmp::min(current + BATCH_SIZE - 1, chain_tip);
            debug!("Downloading blocks {} to {}", current, batch_end);

            let mut block_source = MemoryBlockSource::new();

            let block_range = BlockRange {
                start: Some(BlockId {
                    height: current as u64,
                    hash: vec![],
                }),
                end: Some(BlockId {
                    height: batch_end as u64,
                    hash: vec![],
                }),
            };

            let mut stream = self
                .client
                .get_block_range(block_range)
                .await
                .map_err(|e| anyhow!("Failed to get block range: {e}"))?
                .into_inner();

            use tokio_stream::StreamExt;
            while let Some(block) = stream.next().await {
                let block = block.map_err(|e| anyhow!("Stream error: {e}"))?;
                let height = block.height as u32;
                block_source.insert(height, block);
            }

            debug!("Downloaded {} blocks, scanning...", block_source.len());

            let from_height = BlockHeight::from_u32(current);
            let chain_state = self.get_chain_state_at(current.saturating_sub(1)).await?;

            let scan_result = scan_cached_blocks(
                &MainNetwork,
                &block_source,
                &mut self.wallet,
                from_height,
                &chain_state,
                block_source.len(),
            )
            .map_err(|e| anyhow!("Scan error: {e}"))?;

            total_sapling += scan_result.received_sapling_note_count();
            total_orchard += scan_result.received_orchard_note_count();

            if scan_result.received_sapling_note_count() > 0 || scan_result.received_orchard_note_count() > 0 {
                info!(
                    "Found {} sapling, {} orchard notes in blocks {}-{}",
                    scan_result.received_sapling_note_count(),
                    scan_result.received_orchard_note_count(),
                    current,
                    batch_end
                );
            }

            current = batch_end + 1;
        }

        // Fetch info for any new notes
        let new_memos = if total_sapling > 0 || total_orchard > 0 {
            self.fetch_new_memos()?
        } else {
            vec![]
        };

        info!(
            "Sync complete: {} blocks, {} sapling notes, {} orchard notes, {} memos",
            blocks_to_scan, total_sapling, total_orchard, new_memos.len()
        );

        Ok(ScanResult {
            blocks_scanned: blocks_to_scan,
            sapling_notes_received: total_sapling,
            orchard_notes_received: total_orchard,
            new_memos,
        })
    }

    /// Fetch memos for notes received since last check
    /// Note: zcash_client_sqlite doesn't store memos from compact blocks (they're truncated).
    /// This queries note metadata; for full memos, we'd need to fetch full transactions.
    fn fetch_new_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
        let conn = Connection::open_with_flags(
            &self.db_path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        ).map_err(|e| anyhow!("Failed to open db for reading: {e}"))?;

        // Query new notes with their transaction info
        // Note: compact blocks don't include full memos, but we track the notes
        let mut stmt = conn.prepare(
            "SELECT srn.id, t.txid, t.block, srn.value
             FROM sapling_received_notes srn
             JOIN transactions t ON srn.tx = t.id_tx
             WHERE srn.id > ?1
             ORDER BY srn.id ASC"
        ).map_err(|e| anyhow!("Failed to prepare query: {e}"))?;

        let rows: Vec<(i64, Vec<u8>, Option<u32>, i64)> = stmt
            .query_map([self.last_processed_note_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .map_err(|e| anyhow!("Failed to query notes: {e}"))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| anyhow!("Failed to collect rows: {e}"))?;

        drop(stmt);
        drop(conn);

        if rows.is_empty() {
            return Ok(vec![]);
        }

        let mut memos = Vec::new();
        let mut max_id = self.last_processed_note_id;

        for (note_id, txid_bytes, block_height, value) in rows {
            max_id = max_id.max(note_id);
            let txid_hex = hex::encode(&txid_bytes);
            let height = block_height.unwrap_or(0);

            // For now, we log received notes without memos
            // Full memo extraction requires fetching full transactions
            // which we'll implement when needed for verification responses
            info!(
                "New note received: tx={}, height={}, value={} zats",
                &txid_hex[..16], height, value
            );

            let memo = ReceivedMemo {
                txid_hex,
                height,
                memo: String::new(), // Memo requires full tx fetch
                value_zats: value as u64,
                verification: None,
            };
            memos.push(memo);
        }

        self.last_processed_note_id = max_id;
        Ok(memos)
    }

    /// Run the monitoring loop (blocking)
    pub async fn monitor_loop(&mut self, poll_interval: Duration) -> Result<()> {
        info!("Starting block monitor with {:?} poll interval", poll_interval);

        // Initial sync
        let result = self.sync_incremental().await?;
        for memo in &result.new_memos {
            self.handle_memo(memo);
        }

        let mut last_height = self.get_latest_height().await?;
        info!("Initial sync complete. Chain tip: {}", last_height);

        loop {
            tokio::time::sleep(poll_interval).await;

            match self.get_latest_height().await {
                Ok(current_height) => {
                    if current_height > last_height {
                        info!("New blocks detected: {} -> {}", last_height, current_height);

                        match self.sync_incremental().await {
                            Ok(result) => {
                                if result.blocks_scanned > 0 {
                                    info!(
                                        "Scanned {} blocks, {} new notes",
                                        result.blocks_scanned,
                                        result.sapling_notes_received + result.orchard_notes_received
                                    );
                                }

                                for memo in &result.new_memos {
                                    self.handle_memo(memo);
                                }

                                last_height = current_height;
                            }
                            Err(e) => {
                                error!("Sync error: {}", e);
                            }
                        }
                    } else {
                        debug!("No new blocks (height: {})", current_height);
                    }
                }
                Err(e) => {
                    error!("Failed to get chain height: {}", e);
                }
            }
        }
    }

    /// Handle a received memo
    fn handle_memo(&self, memo: &ReceivedMemo) {
        if let Some(ref verification) = memo.verification {
            info!(
                "VERIFICATION REQUEST: session={}, reply_to={}, value={} zats, tx={}",
                verification.session_id,
                verification.user_address,
                memo.value_zats,
                memo.txid_hex
            );
            // TODO: Generate and send OTP response
        } else if !memo.memo.is_empty() {
            info!(
                "Memo received: \"{}\" (value={} zats, tx={})",
                memo.memo.chars().take(50).collect::<String>(),
                memo.value_zats,
                memo.txid_hex
            );
        }
    }

    /// Get all received notes (queries full history)
    pub fn get_received_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
        // Reset to fetch all
        let saved_id = self.last_processed_note_id;
        self.last_processed_note_id = 0;
        let memos = self.fetch_new_memos()?;
        self.last_processed_note_id = saved_id;
        Ok(memos)
    }
}
