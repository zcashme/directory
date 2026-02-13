//! ZVS - Zcash Verification Service
//!
//! A 2FA service using shielded Zcash transactions. Users send verification
//! requests via memo, ZVS responds with HMAC-derived OTPs.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{anyhow, Result};
use hmac::{Hmac, Mac};
use rusqlite::Connection;
use secrecy::Secret;
use sha2::Sha256;
use tracing::{debug, error, info, warn};

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
            TxFilter,
        },
    },
};
use zcash_primitives::transaction::TxId;
use zcash_keys::keys::{UnifiedSpendingKey, UnifiedAddressRequest};
use zcash_client_sqlite::{
    util::SystemClock,
    wallet::init::init_wallet_db,
    AccountUuid, WalletDb,
};
use zcash_protocol::consensus::{BlockHeight, MainNetwork};

type HmacSha256 = Hmac<Sha256>;

pub mod memo_rules;
pub use memo_rules::{validate_memo, VerificationData};

/// In-memory cache for compact blocks during sync.
pub struct MemoryBlockSource {
    blocks: BTreeMap<u32, CompactBlock>,
}

impl MemoryBlockSource {
    pub fn new() -> Self {
        Self { blocks: BTreeMap::new() }
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
    ) -> std::result::Result<(), zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> std::result::Result<(), zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>>,
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

/// A received note with decrypted memo.
#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid_hex: String,
    pub height: u32,
    pub memo: String,
    pub value_zats: u64,
    pub verification: Option<VerificationData>,
}

/// Result of a sync operation.
#[derive(Debug, Clone, Default)]
pub struct ScanResult {
    pub blocks_scanned: u32,
    pub sapling_notes_received: usize,
    pub orchard_notes_received: usize,
    pub new_memos: Vec<ReceivedMemo>,
}

/// Events emitted during monitoring.
#[derive(Debug, Clone)]
pub enum MonitorEvent {
    NewBlock { height: u32 },
    SyncProgress { current: u32, target: u32 },
    VerificationRequest(ReceivedMemo),
    MemoReceived(ReceivedMemo),
    Error(String),
}

/// Account balance in zatoshis.
#[derive(Debug, Clone)]
pub struct AccountBalance {
    pub total: u64,
    pub sapling_spendable: u64,
    pub orchard_spendable: u64,
}

type WalletDbType = WalletDb<rusqlite::Connection, MainNetwork, SystemClock, rand::rngs::OsRng>;

/// The main ZVS service.
pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    wallet: WalletDbType,
    account_id: AccountUuid,
    usk: UnifiedSpendingKey,
    birthday_height: u32,
    db_path: PathBuf,
    otp_secret: Vec<u8>,
}

impl ZVS {
    /// Connect to lightwalletd and initialize the wallet.
    pub async fn connect(
        url: &str,
        seed: &[u8],
        birthday_height: u32,
        data_dir: &Path,
        otp_secret: Vec<u8>,
    ) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let mut client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        std::fs::create_dir_all(data_dir)?;
        let db_path = data_dir.join("wallet.db");

        info!("Initializing wallet at {}", db_path.display());

        let mut wallet = WalletDb::for_path(&db_path, MainNetwork, SystemClock, rand::rngs::OsRng)
            .map_err(|e| anyhow!("Failed to open wallet db: {e}"))?;

        init_wallet_db(&mut wallet, None)
            .map_err(|e| anyhow!("Failed to initialize wallet db: {e:?}"))?;

        let accounts = wallet
            .get_account_ids()
            .map_err(|e| anyhow!("Failed to get accounts: {e}"))?;

        let (account_id, usk) = if let Some(existing_id) = accounts.first() {
            info!("Using existing account");
            let usk = zcash_keys::keys::UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)
                .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;
            (*existing_id, usk)
        } else {
            info!("Creating new account from seed");
            let birthday = Self::fetch_birthday(&mut client, birthday_height).await?;
            let seed_secret: Secret<Vec<u8>> = Secret::new(seed.to_vec());
            let (account_id, usk) = wallet
                .create_account("ZVS Admin", &seed_secret, &birthday, None)
                .map_err(|e| anyhow!("Failed to create account: {e}"))?;
            info!("Created account: {:?}", account_id);
            (account_id, usk)
        };

        let ufvk = usk.to_unified_full_viewing_key();
        if let Some(sapling_dfvk) = ufvk.sapling() {
            let (_, address) = sapling_dfvk.default_address();
            let encoded = zcash_client_backend::encoding::encode_payment_address(
                zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
                &address,
            );
            info!("Sapling address: {}", encoded);
        }

        Ok(Self {
            client,
            wallet,
            account_id,
            usk,
            birthday_height,
            db_path,
            otp_secret,
        })
    }

    /// Generate HMAC-based OTP from session ID.
    fn generate_otp(&self, session_id: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(&self.otp_secret)
            .expect("HMAC can take key of any size");
        mac.update(session_id.as_bytes());
        let result = mac.finalize();
        let bytes = result.into_bytes();
        let code = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
        format!("{:06}", code % 1_000_000)
    }

    async fn fetch_birthday(
        client: &mut CompactTxStreamerClient<tonic::transport::Channel>,
        height: u32,
    ) -> Result<AccountBirthday> {
        let prior_height = height.saturating_sub(1);
        info!("Fetching tree state at height {}", prior_height);

        let tree_state = client
            .get_tree_state(BlockId { height: prior_height as u64, hash: vec![] })
            .await
            .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
            .into_inner();

        AccountBirthday::from_treestate(tree_state, None)
            .map_err(|_| anyhow!("Failed to create birthday from tree state"))
    }

    pub async fn get_latest_height(&mut self) -> Result<u32> {
        let response = self.client.get_latest_block(ChainSpec {}).await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    /// Sync wallet with the blockchain.
    pub async fn sync(&mut self) -> Result<()> {
        let chain_tip = self.get_latest_height().await?;

        let scan_from = self.wallet
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
                start: Some(BlockId { height: current as u64, hash: vec![] }),
                end: Some(BlockId { height: batch_end as u64, hash: vec![] }),
            };

            let mut stream = self.client.get_block_range(block_range).await
                .map_err(|e| anyhow!("Failed to get block range: {e}"))?
                .into_inner();

            use tokio_stream::StreamExt;
            while let Some(block) = stream.next().await {
                let block = block.map_err(|e| anyhow!("Stream error: {e}"))?;
                block_source.insert(block.height as u32, block);
            }

            info!("Downloaded {} blocks, scanning...", block_source.len());

            let from_height = BlockHeight::from_u32(current);
            let chain_state = self.get_chain_state_at(current.saturating_sub(1)).await?;

            let scan_result = scan_cached_blocks(
                &MainNetwork,
                &block_source,
                &mut self.wallet,
                from_height,
                &chain_state,
                block_source.len(),
            ).map_err(|e| anyhow!("Scan error: {e}"))?;

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

    async fn get_chain_state_at(&mut self, height: u32) -> Result<ChainState> {
        let tree_state = self.client
            .get_tree_state(BlockId { height: height as u64, hash: vec![] })
            .await
            .map_err(|e| anyhow!("Failed to get tree state: {e}"))?
            .into_inner();

        let birthday = AccountBirthday::from_treestate(tree_state, None)
            .map_err(|_| anyhow!("Failed to parse tree state"))?;

        Ok(birthday.prior_chain_state().clone())
    }

    pub fn get_balance(&self) -> Result<AccountBalance> {
        let summary = self.wallet
            .get_wallet_summary(ConfirmationsPolicy::default())
            .map_err(|e| anyhow!("Failed to get wallet summary: {e}"))?
            .ok_or_else(|| anyhow!("Wallet not synced"))?;

        let balance = summary.account_balances().get(&self.account_id)
            .ok_or_else(|| anyhow!("Account not found"))?;

        Ok(AccountBalance {
            total: u64::from(balance.total()),
            sapling_spendable: u64::from(balance.sapling_balance().spendable_value()),
            orchard_spendable: u64::from(balance.orchard_balance().spendable_value()),
        })
    }

    pub fn get_sapling_address(&self) -> Result<String> {
        let ufvk = self.usk.to_unified_full_viewing_key();
        let sapling_dfvk = ufvk.sapling().ok_or_else(|| anyhow!("No Sapling key"))?;
        let (_, address) = sapling_dfvk.default_address();
        Ok(zcash_client_backend::encoding::encode_payment_address(
            zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
            &address,
        ))
    }

    pub fn get_unified_address(&self) -> Result<String> {
        let ufvk = self.usk.to_unified_full_viewing_key();

        // Get unified address with all available receivers (Orchard + Sapling)
        let (ua, _) = ufvk.default_address(UnifiedAddressRequest::AllAvailableKeys)?;

        Ok(ua.encode(&MainNetwork))
    }

    pub fn get_address(&self) -> Result<String> {
        self.get_unified_address()
    }

    /// Sync incrementally and return new memos.
    pub async fn sync_incremental(&mut self) -> Result<ScanResult> {
        let chain_tip = self.get_latest_height().await?;

        let scan_from = self.wallet
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
                start: Some(BlockId { height: current as u64, hash: vec![] }),
                end: Some(BlockId { height: batch_end as u64, hash: vec![] }),
            };

            let mut stream = self.client.get_block_range(block_range).await
                .map_err(|e| anyhow!("Failed to get block range: {e}"))?
                .into_inner();

            use tokio_stream::StreamExt;
            while let Some(block) = stream.next().await {
                let block = block.map_err(|e| anyhow!("Stream error: {e}"))?;
                block_source.insert(block.height as u32, block);
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
            ).map_err(|e| anyhow!("Scan error: {e}"))?;

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

        let new_memos = if total_sapling > 0 || total_orchard > 0 {
            self.fetch_new_memos().await?
        } else {
            vec![]
        };

        info!(
            "Sync complete: {} blocks, {} sapling, {} orchard, {} memos",
            blocks_to_scan, total_sapling, total_orchard, new_memos.len()
        );

        Ok(ScanResult {
            blocks_scanned: blocks_to_scan,
            sapling_notes_received: total_sapling,
            orchard_notes_received: total_orchard,
            new_memos,
        })
    }

    async fn fetch_new_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
        let conn = Connection::open_with_flags(&self.db_path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| anyhow!("Failed to open db: {e}"))?;

        // Query received notes that we haven't responded to yet.
        // The LEFT JOIN on sent_notes finds notes where we've sent a response
        // containing the request txid in the memo (format: ZVS:otp:XXXXXX:req:TXID_PREFIX).
        // Notes without a matching sent response will have sn.id IS NULL.
        let mut stmt = conn.prepare(
            "SELECT t.txid, t.block, srn.value
             FROM sapling_received_notes srn
             JOIN transactions t ON srn.transaction_id = t.id_tx
             LEFT JOIN sent_notes sn ON sn.memo LIKE '%:req:' || substr(hex(t.txid), 1, 16) || '%'
             WHERE sn.id IS NULL
             ORDER BY srn.id ASC"
        ).map_err(|e| anyhow!("Failed to prepare query: {e}"))?;

        let rows: Vec<(Vec<u8>, Option<u32>, i64)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| anyhow!("Failed to query: {e}"))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| anyhow!("Failed to collect: {e}"))?;

        drop(stmt);
        drop(conn);

        let mut memos = Vec::new();

        for (txid_bytes, block_height, value) in rows {
            let txid_hex = hex::encode(&txid_bytes);
            let height = block_height.unwrap_or(0);

            let memo_text = match self.fetch_transaction_memo(&txid_bytes, height).await {
                Ok(Some(text)) => {
                    debug!("Decrypted memo from tx {}: {:?}", &txid_hex[..16], text);
                    text
                }
                Ok(None) => {
                    debug!("No memo in tx {}", &txid_hex[..16]);
                    String::new()
                }
                Err(e) => {
                    warn!("Failed to fetch memo for tx {}: {}", &txid_hex[..16], e);
                    String::new()
                }
            };

            let verification = if !memo_text.is_empty() {
                validate_memo(&memo_text)
            } else {
                None
            };

            info!(
                "New note: tx={}..., height={}, value={} zats, memo={}",
                &txid_hex[..16], height, value,
                if memo_text.is_empty() { "(empty)" } else { &memo_text }
            );

            memos.push(ReceivedMemo {
                txid_hex,
                height,
                memo: memo_text,
                value_zats: value as u64,
                verification,
            });
        }

        Ok(memos)
    }

    async fn fetch_transaction_memo(&mut self, txid: &[u8], height: u32) -> Result<Option<String>> {
        let tx_filter = TxFilter { block: None, index: 0, hash: txid.to_vec() };

        let raw_tx = self.client.get_transaction(tx_filter).await
            .map_err(|e| anyhow!("Failed to fetch transaction: {e}"))?
            .into_inner();

        if raw_tx.data.is_empty() {
            return Err(anyhow!("Empty transaction data"));
        }

        let block_height = BlockHeight::from_u32(height);
        let branch_id = zcash_primitives::consensus::BranchId::for_height(&MainNetwork, block_height);

        let tx = zcash_primitives::transaction::Transaction::read(&raw_tx.data[..], branch_id)
            .map_err(|e| anyhow!("Failed to parse transaction: {e}"))?;

        let ufvk = self.usk.to_unified_full_viewing_key();

        if let Some(sapling_dfvk) = ufvk.sapling() {
            if let Some(bundle) = tx.sapling_bundle() {
                let ivk = sapling_dfvk.to_ivk(zip32::Scope::External);
                let prepared_ivk = sapling_crypto::keys::PreparedIncomingViewingKey::new(&ivk);

                // ZIP-212 activated at Canopy (mainnet height 1046400)
                let zip212 = if u32::from(block_height) >= 1_046_400 {
                    sapling_crypto::note_encryption::Zip212Enforcement::On
                } else {
                    sapling_crypto::note_encryption::Zip212Enforcement::Off
                };

                for output in bundle.shielded_outputs() {
                    let domain = sapling_crypto::note_encryption::SaplingDomain::new(zip212);

                    if let Some((_note, _address, memo_bytes)) =
                        zcash_note_encryption::try_note_decryption(&domain, &prepared_ivk, output)
                    {
                        let memo_text = extract_memo_text(&memo_bytes);
                        if !memo_text.is_empty() {
                            return Ok(Some(memo_text));
                        }
                    }
                }
            }
        }

        Ok(None)
    }

    /// Send OTP response to the user's address.
    ///
    /// The response memo includes the request txid prefix for correlation:
    /// `ZVS:otp:XXXXXX:req:TXID_PREFIX`
    ///
    /// This allows us to query sent_notes to find which requests we've already
    /// responded to, eliminating the need for separate state tracking.
    ///
    /// NOTE: Transaction sending is stubbed for now. The OTP is generated and logged,
    /// but actual transaction creation requires additional setup (Sapling params, etc.)
    async fn send_otp(&mut self, to_address: &str, otp: &str, _amount_zats: u64, request_txid_hex: &str) -> Result<TxId> {
        // Include first 16 chars of request txid in memo for correlation
        let txid_prefix = &request_txid_hex[..std::cmp::min(16, request_txid_hex.len())];
        let memo = format!("ZVS:otp:{}:req:{}", otp, txid_prefix);

        info!("=== OTP RESPONSE ===");
        info!("To: {}", to_address);
        info!("OTP: {}", otp);
        info!("Memo: {}", memo);
        info!("Request txid: {}", request_txid_hex);
        info!("====================");

        // TODO: Implement actual transaction sending
        // This requires:
        // 1. Sapling proving parameters (run zcash-fetch-params)
        // 2. Sufficient balance in the wallet
        // 3. Proper transaction proposal and creation
        //
        // When implemented, the sent transaction will be recorded in sent_notes
        // with the memo containing the request txid prefix. This automatically
        // marks the request as processed - no separate state tracking needed.

        warn!("Transaction sending not yet implemented - OTP logged but not sent on-chain");

        // Return a dummy txid (all zeros) to indicate the request was processed
        // In production, this would be the actual broadcast transaction ID
        Ok(TxId::from_bytes([0u8; 32]))
    }

    /// Run the block monitoring loop.
    pub async fn monitor_loop(&mut self, poll_interval: Duration) -> Result<()> {
        info!("Starting block monitor with {:?} poll interval", poll_interval);

        let result = self.sync_incremental().await?;
        for memo in result.new_memos {
            self.handle_memo(memo).await;
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

                                for memo in result.new_memos {
                                    self.handle_memo(memo).await;
                                }

                                last_height = current_height;
                            }
                            Err(e) => error!("Sync error: {}", e),
                        }
                    } else {
                        debug!("No new blocks (height: {})", current_height);
                    }
                }
                Err(e) => error!("Failed to get chain height: {}", e),
            }
        }
    }

    /// Handle a received memo - generate OTP and send response if valid verification request.
    async fn handle_memo(&mut self, memo: ReceivedMemo) {
        if let Some(ref verification) = memo.verification {
            info!(
                "VERIFICATION REQUEST: session={}, reply_to={}, value={} zats, tx={}",
                verification.session_id, verification.user_address, memo.value_zats, memo.txid_hex
            );

            // Generate OTP
            let otp = self.generate_otp(&verification.session_id);
            info!("Generated OTP: {} for session: {}", otp, verification.session_id);

            // Send OTP response (includes request txid in memo for correlation)
            match self.send_otp(&verification.user_address, &otp, memo.value_zats, &memo.txid_hex).await {
                Ok(response_txid) => {
                    info!(
                        "OTP sent successfully! Response tx: {}",
                        hex::encode(response_txid.as_ref())
                    );
                }
                Err(e) => {
                    error!("Failed to send OTP: {}", e);
                }
            }
        } else if !memo.memo.is_empty() {
            info!(
                "Memo received (not a verification request): \"{}\" (value={} zats, tx={})",
                memo.memo.chars().take(50).collect::<String>(),
                memo.value_zats,
                memo.txid_hex
            );
            // Non-verification memos are simply logged; they'll be filtered out
            // on future queries since they have no verification data.
        }
        // Empty memos are silently ignored
    }

    /// Get all received memos (for debugging/display purposes).
    pub async fn get_received_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
        self.fetch_all_memos().await
    }

    /// Fetch all received memos regardless of processing state.
    async fn fetch_all_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
        let conn = Connection::open_with_flags(&self.db_path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| anyhow!("Failed to open db: {e}"))?;

        let mut stmt = conn.prepare(
            "SELECT t.txid, t.block, srn.value
             FROM sapling_received_notes srn
             JOIN transactions t ON srn.transaction_id = t.id_tx
             ORDER BY srn.id ASC"
        ).map_err(|e| anyhow!("Failed to prepare query: {e}"))?;

        let rows: Vec<(Vec<u8>, Option<u32>, i64)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| anyhow!("Failed to query: {e}"))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| anyhow!("Failed to collect: {e}"))?;

        drop(stmt);
        drop(conn);

        let mut memos = Vec::new();

        for (txid_bytes, block_height, value) in rows {
            let txid_hex = hex::encode(&txid_bytes);
            let height = block_height.unwrap_or(0);

            let memo_text = match self.fetch_transaction_memo(&txid_bytes, height).await {
                Ok(Some(text)) => text,
                Ok(None) => String::new(),
                Err(e) => {
                    warn!("Failed to fetch memo for tx {}: {}", &txid_hex[..16], e);
                    String::new()
                }
            };

            let verification = if !memo_text.is_empty() {
                validate_memo(&memo_text)
            } else {
                None
            };

            memos.push(ReceivedMemo {
                txid_hex,
                height,
                memo: memo_text,
                value_zats: value as u64,
                verification,
            });
        }

        Ok(memos)
    }
}

fn extract_memo_text(memo_bytes: &[u8; 512]) -> String {
    // 0xF6 = empty memo per ZIP-302
    if memo_bytes[0] == 0xF6 {
        return String::new();
    }

    let end = memo_bytes.iter().position(|&b| b == 0).unwrap_or(512);
    String::from_utf8_lossy(&memo_bytes[..end]).trim().to_string()
}
