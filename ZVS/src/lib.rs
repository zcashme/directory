//! ZVS - Stateless Zcash Verification Service
//!
//! Connects to lightwalletd, decrypts incoming memos.

use anyhow::{anyhow, Result};
use std::io::Cursor;
use tonic::transport::Channel;
use zcash_primitives::{
    consensus::{BlockHeight, MainNetwork},
    sapling::{
        keys::PreparedIncomingViewingKey,
        note::ExtractedNoteCommitment,
        note_encryption::{try_sapling_compact_note_decryption, try_sapling_note_decryption},
    },
    transaction::{components::sapling::CompactOutputDescription, Transaction},
    zip32::sapling::ExtendedFullViewingKey,
};

pub mod proto {
    tonic::include_proto!("cash.z.wallet.sdk.rpc");
}

use proto::{
    compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec, TxFilter,
};

/// Decrypted memo from blockchain
#[derive(Debug, Clone)]
pub struct Memo {
    pub txid: String,
    pub height: u32,
    pub amount: u64,
    pub text: String,
}

/// Decode bech32 viewing key
fn decode_vk(key: &str) -> Result<ExtendedFullViewingKey> {
    let (hrp, data, _) = bech32::decode(key).map_err(|e| anyhow!("bech32: {e}"))?;
    if hrp != "zxviews" {
        return Err(anyhow!("expected zxviews HRP, got {hrp}"));
    }
    let bytes: Vec<u8> =
        bech32::FromBase32::from_base32(&data).map_err(|e| anyhow!("base32: {e}"))?;
    ExtendedFullViewingKey::read(Cursor::new(bytes)).map_err(|e| anyhow!("parse fvk: {e}"))
}

/// Try compact decryption (detects payment, returns amount but no memo)
fn try_compact_decrypt(
    out: &proto::CompactSaplingOutput,
    ivk: &PreparedIncomingViewingKey,
    height: BlockHeight,
) -> Option<u64> {
    let epk_bytes: [u8; 32] = out.ephemeral_key.clone().try_into().ok()?;
    let cmu: ExtractedNoteCommitment =
        Option::from(ExtractedNoteCommitment::from_bytes(&out.cmu.clone().try_into().ok()?))?;

    let compact = CompactOutputDescription {
        ephemeral_key: epk_bytes.into(),
        cmu,
        enc_ciphertext: out.ciphertext.clone().try_into().ok()?,
    };

    let (note, _) = try_sapling_compact_note_decryption(&MainNetwork, height, ivk, &compact)?;
    Some(note.value().inner())
}

/// Decrypt full transaction output to get memo
fn decrypt_memo(
    tx: &Transaction,
    output_idx: usize,
    ivk: &PreparedIncomingViewingKey,
    height: BlockHeight,
) -> Option<String> {
    let output = tx.sapling_bundle()?.shielded_outputs().get(output_idx)?;
    let (_, _, memo) = try_sapling_note_decryption(&MainNetwork, height, ivk, output)?;
    let bytes = memo.as_slice();
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    Some(String::from_utf8_lossy(&bytes[..end]).into())
}

/// ZVS instance
pub struct ZVS {
    client: CompactTxStreamerClient<Channel>,
    ivk: PreparedIncomingViewingKey,
}

impl ZVS {
    pub async fn connect(url: &str, viewing_key: &str) -> Result<Self> {
        let vk = decode_vk(viewing_key)?;
        let ivk = PreparedIncomingViewingKey::new(&vk.fvk.vk.ivk());
        let client = CompactTxStreamerClient::connect(url.to_owned()).await?;
        Ok(Self { client, ivk })
    }

    pub async fn height(&mut self) -> Result<u32> {
        Ok(self.client.get_latest_block(ChainSpec {}).await?.into_inner().height as u32)
    }

    /// Scan blocks and decrypt memos
    pub async fn scan(&mut self, num_blocks: u32) -> Result<Vec<Memo>> {
        let latest = self.height().await?;
        let start = latest.saturating_sub(num_blocks);

        let range = BlockRange {
            start: Some(BlockId { height: start as u64, hash: vec![] }),
            end: Some(BlockId { height: latest as u64, hash: vec![] }),
        };
        let mut stream = self.client.get_block_range(range).await?.into_inner();

        // Phase 1: Find candidates using compact decryption
        let mut candidates: Vec<(Vec<u8>, u32, usize, u64)> = vec![];
        while let Some(block) = stream.message().await? {
            let h = BlockHeight::from_u32(block.height as u32);
            for tx in &block.vtx {
                for (idx, out) in tx.outputs.iter().enumerate() {
                    if let Some(amount) = try_compact_decrypt(out, &self.ivk, h) {
                        candidates.push((tx.hash.clone(), block.height as u32, idx, amount));
                    }
                }
            }
        }

        // Phase 2: Fetch full transactions and decrypt memos
        let mut memos = vec![];
        for (txid, height, output_idx, amount) in candidates {
            let resp = self.client.get_transaction(TxFilter { hash: txid.clone() }).await?;
            let tx = Transaction::read(
                &resp.into_inner().data[..],
                zcash_primitives::consensus::BranchId::Nu5,
            )
            .map_err(|e| anyhow!("parse tx: {e}"))?;

            if let Some(text) = decrypt_memo(&tx, output_idx, &self.ivk, BlockHeight::from_u32(height)) {
                let mut txid_rev = txid;
                txid_rev.reverse();
                memos.push(Memo {
                    txid: hex::encode(txid_rev),
                    height,
                    amount,
                    text,
                });
            }
        }

        Ok(memos)
    }
}
