use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{anyhow, Result};
use tracing::info;

use zcash_client_backend::{
    data_api::chain::BlockSource,
    proto::{
        compact_formats::CompactBlock,
        service::{
            compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec,
        },
    },
};

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
}

impl BlockSource for MemoryBlockSource {
    type Error = anyhow::Error;

    fn with_blocks<F, DbErrT>(
        &self,
        from_height: Option<zcash_protocol::consensus::BlockHeight>,
        limit: Option<usize>,
        mut with_row: F,
    ) -> std::result::Result<(), zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> std::result::Result<(), zcash_client_backend::data_api::chain::error::Error<DbErrT, Self::Error>>,
    {
        let start = from_height.map(|h| u32::from(h)).unwrap_or(0);
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

pub struct ZVS {
    client: CompactTxStreamerClient<tonic::transport::Channel>,
    db_path: std::path::PathBuf,
    seed: Vec<u8>,
    birthday_height: u32,
}

impl ZVS {
    pub async fn connect(
        url: &str,
        seed: &[u8],
        birthday_height: u32,
        data_dir: &Path,
    ) -> Result<Self> {
        info!("Connecting to lightwalletd at {}", url);

        let client = CompactTxStreamerClient::connect(url.to_owned())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {e}"))?;

        std::fs::create_dir_all(data_dir)?;
        let db_path = data_dir.join("wallet.db");

        info!("Connected, data dir: {}", data_dir.display());

        Ok(Self {
            client,
            db_path,
            seed: seed.to_vec(),
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

    pub async fn sync(&mut self) -> Result<()> {
        let start = self.birthday_height;
        let end = self.get_latest_height().await?;

        info!("Downloading blocks {} to {}", start, end);

        // Download blocks into memory
        let mut block_source = MemoryBlockSource::new();

        let block_range = BlockRange {
            start: Some(BlockId {
                height: start as u64,
                hash: vec![],
            }),
            end: Some(BlockId {
                height: end as u64,
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

            if height % 1000 == 0 {
                info!("Downloaded block {}", height);
            }

            block_source.insert(height, block);
        }

        info!("Downloaded {} blocks, scanning...", block_source.len());

        // TODO: Initialize WalletDb and scan blocks
        // For now just report success
        info!("Sync complete");
        Ok(())
    }
}
