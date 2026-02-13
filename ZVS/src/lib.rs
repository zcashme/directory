use anyhow::{anyhow, Result};
use tracing::info;

use orchard::keys::{FullViewingKey, PreparedIncomingViewingKey, SpendingKey};
use orchard::note_encryption::CompactAction;
use zcash_client_backend::proto::compact_formats::CompactOrchardAction;
use zcash_client_backend::proto::service::{
    compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec, TxFilter,
};

#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid: Vec<u8>,
    pub height: u32,
    pub memo: String,
}

struct DetectedNote {
    txid: Vec<u8>,
    height: u32,
    action_idx: usize,
}

pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    fvk: FullViewingKey,
    birthday_height: u32,
}

impl ZVS {
    pub async fn connect(url: &str, seed: &[u8], birthday_height: u32) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        // Derive Orchard spending key from seed
        let sk = SpendingKey::from_zip32_seed(seed, 1, zip32::AccountId::ZERO)
            .map_err(|_| anyhow!("Failed to derive Orchard spending key"))?;
        let fvk = FullViewingKey::from(&sk);

        info!("Connected and Orchard keys derived");

        Ok(Self {
            client,
            fvk,
            birthday_height,
        })
    }

    pub async fn get_latest_height(&mut self) -> Result<u32> {
        let response = self
            .client
            .get_latest_block(ChainSpec {})
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {e}"))?;
        Ok(response.into_inner().height as u32)
    }

    pub fn get_address(&self) -> Result<String> {
        let address = self.fvk.address_at(0u32, orchard::keys::Scope::External);
        Ok(format!("{:?}", address))
    }

    pub fn orchard_ivk(&self) -> PreparedIncomingViewingKey {
        let ivk = self.fvk.to_ivk(orchard::keys::Scope::External);
        PreparedIncomingViewingKey::new(&ivk)
    }

    pub async fn scan_for_memos(&mut self, from_height: Option<u32>) -> Result<Vec<ReceivedMemo>> {
        let start_height = from_height.unwrap_or(self.birthday_height);
        let end_height = self.get_latest_height().await?;

        info!("Scanning blocks {} to {}", start_height, end_height);

        let ivk = self.orchard_ivk();
        let mut detected: Vec<DetectedNote> = Vec::new();

        // Phase 1: Scan compact blocks to find transactions with notes for us
        let range = BlockRange {
            start: Some(BlockId {
                height: start_height as u64,
                hash: vec![],
            }),
            end: Some(BlockId {
                height: end_height as u64,
                hash: vec![],
            }),
        };

        let mut stream = self
            .client
            .get_block_range(range)
            .await
            .map_err(|e| anyhow!("Failed to get block range: {e}"))?
            .into_inner();

        use tokio_stream::StreamExt;
        while let Some(block) = stream.next().await {
            let block = block.map_err(|e| anyhow!("Stream error: {e}"))?;
            let height = block.height as u32;

            if height % 1000 == 0 {
                info!("Scanning block {}", height);
            }

            for tx in block.vtx {
                for (action_idx, action) in tx.actions.iter().enumerate() {
                    if try_compact_decrypt(&ivk, action) {
                        info!("Detected note at height {} action {}", height, action_idx);
                        detected.push(DetectedNote {
                            txid: tx.hash.clone(),
                            height,
                            action_idx,
                        });
                    }
                }
            }
        }

        info!(
            "Compact scan complete. Found {} notes, fetching full transactions...",
            detected.len()
        );

        // Phase 2: Fetch full transactions and decrypt memos
        let mut memos = Vec::new();

        for note in detected {
            match self.fetch_memo(&ivk, &note).await {
                Ok(memo) => {
                    memos.push(ReceivedMemo {
                        txid: note.txid,
                        height: note.height,
                        memo,
                    });
                }
                Err(e) => {
                    info!("Failed to fetch memo for tx at height {}: {}", note.height, e);
                }
            }
        }

        info!("Scan complete. Found {} memos", memos.len());
        Ok(memos)
    }

    async fn fetch_memo(&mut self, ivk: &PreparedIncomingViewingKey, note: &DetectedNote) -> Result<String> {
        // Fetch full transaction
        let raw_tx = self
            .client
            .get_transaction(TxFilter {
                block: None,
                index: 0,
                hash: note.txid.clone(),
            })
            .await
            .map_err(|e| anyhow!("Failed to fetch transaction: {e}"))?
            .into_inner();

        // Parse the transaction
        let tx = zcash_primitives::transaction::Transaction::read(
            &raw_tx.data[..],
            zcash_primitives::consensus::BranchId::Nu5,
        )
        .map_err(|e| anyhow!("Failed to parse transaction: {e}"))?;

        // Get the Orchard bundle
        let bundle = tx
            .orchard_bundle()
            .ok_or_else(|| anyhow!("Transaction has no Orchard bundle"))?;

        // Get the specific action
        let action = bundle
            .actions()
            .get(note.action_idx)
            .ok_or_else(|| anyhow!("Action index out of bounds"))?;

        // Full decryption with memo
        let domain = orchard::note_encryption::OrchardDomain::for_action(action);

        let (note_data, _recipient, memo) =
            zcash_note_encryption::try_note_decryption(&domain, ivk, action)
                .ok_or_else(|| anyhow!("Failed to decrypt note"))?;

        info!("Decrypted note value: {}", note_data.value().inner());

        // Convert memo bytes to string
        let memo_str = extract_memo_text(&memo);

        Ok(memo_str)
    }
}

fn try_compact_decrypt(ivk: &PreparedIncomingViewingKey, action: &CompactOrchardAction) -> bool {
    use orchard::note_encryption::OrchardDomain;
    use zcash_note_encryption::try_compact_note_decryption;

    let nullifier: [u8; 32] = match action.nullifier.clone().try_into() {
        Ok(n) => n,
        Err(_) => return false,
    };
    let cmx: [u8; 32] = match action.cmx.clone().try_into() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let ephemeral_key: [u8; 32] = match action.ephemeral_key.clone().try_into() {
        Ok(e) => e,
        Err(_) => return false,
    };
    let enc_ciphertext: [u8; 52] = match action.ciphertext.clone().try_into() {
        Ok(c) => c,
        Err(_) => return false,
    };

    let nf = match orchard::note::Nullifier::from_bytes(&nullifier).into() {
        Some(n) => n,
        None => return false,
    };
    let cmx_parsed = match orchard::note::ExtractedNoteCommitment::from_bytes(&cmx).into() {
        Some(c) => c,
        None => return false,
    };

    let compact_action = CompactAction::from_parts(
        nf,
        cmx_parsed,
        zcash_note_encryption::EphemeralKeyBytes(ephemeral_key),
        enc_ciphertext,
    );

    let domain = OrchardDomain::for_compact_action(&compact_action);

    try_compact_note_decryption::<OrchardDomain, CompactAction>(&domain, ivk, &compact_action)
        .is_some()
}

fn extract_memo_text(memo_bytes: &[u8; 512]) -> String {
    // Memo format: first byte indicates type
    // 0xF6 = empty memo
    // 0x00-0xF4 = UTF-8 text (first byte is part of text or indicates text follows)

    if memo_bytes[0] == 0xF6 {
        return String::new();
    }

    // Find the end of the text (null terminator or 0xF6 padding)
    let end = memo_bytes
        .iter()
        .position(|&b| b == 0x00 || b == 0xF6)
        .unwrap_or(512);

    String::from_utf8_lossy(&memo_bytes[..end]).to_string()
}
