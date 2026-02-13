use anyhow::{anyhow, Result};
use tracing::info;

use orchard::keys::{FullViewingKey, PreparedIncomingViewingKey, SpendingKey};
use orchard::note_encryption::CompactAction;
use zcash_client_backend::proto::compact_formats::CompactOrchardAction;
use zcash_client_backend::proto::service::{
    compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec,
};

#[derive(Debug, Clone)]
pub struct ReceivedMemo {
    pub txid: Vec<u8>,
    pub height: u32,
    pub memo: String,
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
        let mut memos = Vec::new();

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
                for action in &tx.actions {
                    if let Some(memo) = try_decrypt_orchard(&ivk, action) {
                        info!("Found memo at height {}: {:?}", height, memo);
                        memos.push(ReceivedMemo {
                            txid: tx.hash.clone(),
                            height,
                            memo,
                        });
                    }
                }
            }
        }

        info!("Scan complete. Found {} memos", memos.len());
        Ok(memos)
    }
}

fn try_decrypt_orchard(
    ivk: &PreparedIncomingViewingKey,
    action: &CompactOrchardAction,
) -> Option<String> {
    use orchard::note_encryption::OrchardDomain;
    use zcash_note_encryption::try_compact_note_decryption;

    // Parse compact action fields
    let nullifier: [u8; 32] = action.nullifier.clone().try_into().ok()?;
    let cmx: [u8; 32] = action.cmx.clone().try_into().ok()?;
    let ephemeral_key: [u8; 32] = action.ephemeral_key.clone().try_into().ok()?;
    let enc_ciphertext: [u8; 52] = action.ciphertext.clone().try_into().ok()?;

    let compact_action = CompactAction::from_parts(
        orchard::note::Nullifier::from_bytes(&nullifier).unwrap(),
        orchard::note::ExtractedNoteCommitment::from_bytes(&cmx).unwrap(),
        zcash_note_encryption::EphemeralKeyBytes(ephemeral_key),
        enc_ciphertext,
    );

    let domain = OrchardDomain::for_compact_action(&compact_action);

    // Try to decrypt
    let (note, _recipient): (orchard::Note, orchard::Address) = try_compact_note_decryption(
        &domain,
        ivk,
        &compact_action,
    )?;

    // Compact blocks don't include full memo - only 52 bytes of ciphertext
    // We detected a note for us, but need full tx for actual memo
    Some(format!("[note found, value: {}]", note.value().inner()))
}
