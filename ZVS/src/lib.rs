use anyhow::{anyhow, Result};
use tracing::info;

use orchard::keys::{FullViewingKey as OrchardFVK, PreparedIncomingViewingKey, SpendingKey};
use orchard::note_encryption::CompactAction;
use zcash_client_backend::proto::compact_formats::{CompactOrchardAction, CompactSaplingOutput};
use zcash_client_backend::proto::service::{
    compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec, TxFilter,
};
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_protocol::consensus::MainNetwork;

#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid: Vec<u8>,
    pub height: u32,
    pub memo: String,
    pub pool: String,
}

#[derive(Clone)]
enum DetectedNote {
    Sapling { txid: Vec<u8>, height: u32, output_idx: usize },
    Orchard { txid: Vec<u8>, height: u32, action_idx: usize },
}

pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    usk: UnifiedSpendingKey,
    orchard_fvk: OrchardFVK,
    birthday_height: u32,
}

impl ZVS {
    pub async fn connect(url: &str, seed: &[u8], birthday_height: u32) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        // Derive unified spending key (includes both Sapling and Orchard)
        let usk = UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)
            .map_err(|e| anyhow!("Failed to derive spending key: {e:?}"))?;

        // Also derive standalone Orchard FVK for scanning
        let orchard_sk = SpendingKey::from_zip32_seed(seed, 1, zip32::AccountId::ZERO)
            .map_err(|_| anyhow!("Failed to derive Orchard spending key"))?;
        let orchard_fvk = OrchardFVK::from(&orchard_sk);

        info!("Connected and keys derived (Sapling + Orchard)");

        Ok(Self {
            client,
            usk,
            orchard_fvk,
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

    pub fn get_sapling_address(&self) -> Result<String> {
        let ufvk = self.usk.to_unified_full_viewing_key();
        let sapling_dfvk = ufvk.sapling().ok_or_else(|| anyhow!("No Sapling key"))?;
        let (_, address) = sapling_dfvk.default_address();
        Ok(zcash_keys::encoding::encode_payment_address(
            zcash_protocol::constants::mainnet::HRP_SAPLING_PAYMENT_ADDRESS,
            &address,
        ))
    }

    pub fn get_orchard_address(&self) -> Result<String> {
        let address = self.orchard_fvk.address_at(0u32, orchard::keys::Scope::External);
        Ok(format!("{:?}", address))
    }

    fn sapling_ivk(&self) -> sapling_crypto::keys::PreparedIncomingViewingKey {
        let ufvk = self.usk.to_unified_full_viewing_key();
        let sapling_dfvk = ufvk.sapling().unwrap();
        let ivk = sapling_dfvk.to_ivk(zip32::Scope::External);
        sapling_crypto::keys::PreparedIncomingViewingKey::new(&ivk)
    }

    fn orchard_ivk(&self) -> PreparedIncomingViewingKey {
        let ivk = self.orchard_fvk.to_ivk(orchard::keys::Scope::External);
        PreparedIncomingViewingKey::new(&ivk)
    }

    pub async fn scan_for_memos(&mut self, from_height: Option<u32>) -> Result<Vec<ReceivedMemo>> {
        let start_height = from_height.unwrap_or(self.birthday_height);
        let end_height = self.get_latest_height().await?;

        info!("Scanning blocks {} to {}", start_height, end_height);

        let sapling_ivk = self.sapling_ivk();
        let orchard_ivk = self.orchard_ivk();
        let mut detected: Vec<DetectedNote> = Vec::new();

        // Phase 1: Scan compact blocks
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
                // Scan Sapling outputs
                for (output_idx, output) in tx.outputs.iter().enumerate() {
                    if try_sapling_compact_decrypt(&sapling_ivk, height, output) {
                        info!("Detected Sapling note at height {} output {}", height, output_idx);
                        detected.push(DetectedNote::Sapling {
                            txid: tx.hash.clone(),
                            height,
                            output_idx,
                        });
                    }
                }

                // Scan Orchard actions
                for (action_idx, action) in tx.actions.iter().enumerate() {
                    if try_orchard_compact_decrypt(&orchard_ivk, action) {
                        info!("Detected Orchard note at height {} action {}", height, action_idx);
                        detected.push(DetectedNote::Orchard {
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
            match self.fetch_memo(&note).await {
                Ok(memo) => {
                    let (txid, height, pool) = match &note {
                        DetectedNote::Sapling { txid, height, .. } => (txid.clone(), *height, "sapling"),
                        DetectedNote::Orchard { txid, height, .. } => (txid.clone(), *height, "orchard"),
                    };
                    memos.push(ReceivedMemo {
                        txid,
                        height,
                        memo,
                        pool: pool.to_string(),
                    });
                }
                Err(e) => {
                    let height = match &note {
                        DetectedNote::Sapling { height, .. } => height,
                        DetectedNote::Orchard { height, .. } => height,
                    };
                    info!("Failed to fetch memo for tx at height {}: {}", height, e);
                }
            }
        }

        info!("Scan complete. Found {} memos", memos.len());
        Ok(memos)
    }

    async fn fetch_memo(&mut self, note: &DetectedNote) -> Result<String> {
        let txid = match note {
            DetectedNote::Sapling { txid, .. } => txid,
            DetectedNote::Orchard { txid, .. } => txid,
        };

        // Fetch full transaction
        let raw_tx = self
            .client
            .get_transaction(TxFilter {
                block: None,
                index: 0,
                hash: txid.clone(),
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

        match note {
            DetectedNote::Sapling { output_idx, height, .. } => {
                self.decrypt_sapling_memo(&tx, *output_idx, *height)
            }
            DetectedNote::Orchard { action_idx, .. } => {
                self.decrypt_orchard_memo(&tx, *action_idx)
            }
        }
    }

    fn decrypt_sapling_memo(
        &self,
        tx: &zcash_primitives::transaction::Transaction,
        output_idx: usize,
        height: u32,
    ) -> Result<String> {
        let bundle = tx
            .sapling_bundle()
            .ok_or_else(|| anyhow!("Transaction has no Sapling bundle"))?;

        let output = bundle
            .shielded_outputs()
            .get(output_idx)
            .ok_or_else(|| anyhow!("Output index out of bounds"))?;

        let sapling_ivk = self.sapling_ivk();

        let zip212 = zcash_primitives::transaction::components::sapling::zip212_enforcement(
            &MainNetwork,
            zcash_protocol::consensus::BlockHeight::from_u32(height),
        );
        let domain = sapling_crypto::note_encryption::SaplingDomain::new(zip212);

        let (note, _recipient, memo) =
            zcash_note_encryption::try_note_decryption(&domain, &sapling_ivk, output)
                .ok_or_else(|| anyhow!("Failed to decrypt Sapling note"))?;

        info!("Decrypted Sapling note value: {}", note.value().inner());

        Ok(extract_memo_text(&memo))
    }

    fn decrypt_orchard_memo(
        &self,
        tx: &zcash_primitives::transaction::Transaction,
        action_idx: usize,
    ) -> Result<String> {
        let bundle = tx
            .orchard_bundle()
            .ok_or_else(|| anyhow!("Transaction has no Orchard bundle"))?;

        let action = bundle
            .actions()
            .get(action_idx)
            .ok_or_else(|| anyhow!("Action index out of bounds"))?;

        let orchard_ivk = self.orchard_ivk();
        let domain = orchard::note_encryption::OrchardDomain::for_action(action);

        let (note, _recipient, memo) =
            zcash_note_encryption::try_note_decryption(&domain, &orchard_ivk, action)
                .ok_or_else(|| anyhow!("Failed to decrypt Orchard note"))?;

        info!("Decrypted Orchard note value: {}", note.value().inner());

        Ok(extract_memo_text(&memo))
    }
}

fn try_sapling_compact_decrypt(
    ivk: &sapling_crypto::keys::PreparedIncomingViewingKey,
    height: u32,
    output: &CompactSaplingOutput,
) -> bool {
    use sapling_crypto::note_encryption::{CompactOutputDescription, SaplingDomain};
    use zcash_note_encryption::try_compact_note_decryption;

    let cmu: [u8; 32] = match output.cmu.clone().try_into() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let ephemeral_key: [u8; 32] = match output.ephemeral_key.clone().try_into() {
        Ok(e) => e,
        Err(_) => return false,
    };
    let enc_ciphertext: [u8; 52] = match output.ciphertext.clone().try_into() {
        Ok(c) => c,
        Err(_) => return false,
    };

    let cmu = match sapling_crypto::note::ExtractedNoteCommitment::from_bytes(&cmu).into() {
        Some(c) => c,
        None => return false,
    };

    let compact_output = CompactOutputDescription {
        cmu,
        ephemeral_key: zcash_note_encryption::EphemeralKeyBytes(ephemeral_key),
        enc_ciphertext,
    };

    let zip212 = zcash_primitives::transaction::components::sapling::zip212_enforcement(
        &MainNetwork,
        zcash_protocol::consensus::BlockHeight::from_u32(height),
    );
    let domain = SaplingDomain::new(zip212);

    try_compact_note_decryption(&domain, ivk, &compact_output).is_some()
}

fn try_orchard_compact_decrypt(
    ivk: &PreparedIncomingViewingKey,
    action: &CompactOrchardAction,
) -> bool {
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
    if memo_bytes[0] == 0xF6 {
        return String::new();
    }

    let end = memo_bytes
        .iter()
        .position(|&b| b == 0x00 || b == 0xF6)
        .unwrap_or(512);

    String::from_utf8_lossy(&memo_bytes[..end]).to_string()
}
