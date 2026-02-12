//! # ZVS - Zcash Verification Service
//!
//! Connect to lightwalletd and scan for incoming memos.
//!
//! ## Example
//!
//! ```no_run
//! use zvs::ZVS;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let zvs = ZVS::connect(
//!         "http://localhost:9067",
//!         "zxviews1...".to_string(),
//!         "secret-extended-key-main1...".to_string(),
//!     ).await?;
//!
//!     // Verify connection
//!     let height = zvs.get_height().await?;
//!     println!("Connected! Current block height: {}", height);
//!
//!     // Scan last 100 blocks
//!     let memos = zvs.scan(100).await?;
//!     println!("Found {} memos", memos.len());
//!
//!     Ok(())
//! }
//! ```

pub mod client;
pub mod memo;

pub use client::LightwalletdClient;
pub use memo::IncomingMemo;

use anyhow::Result;

/// ZVS - connects to lightwalletd and scans for memos
pub struct ZVS {
    client: LightwalletdClient,
    viewing_key: String,
    spending_key: String,
}

impl ZVS {
    /// Connect to lightwalletd
    ///
    /// ## Arguments
    /// * `lightwalletd_url` - URL of lightwalletd server (e.g., "http://localhost:9067")
    /// * `viewing_key` - Full viewing key for decrypting memos (zxviews1...)
    /// * `spending_key` - Extended spending key (secret-extended-key-main1...)
    pub async fn connect(
        lightwalletd_url: &str,
        viewing_key: String,
        spending_key: String,
    ) -> Result<Self> {
        let client = LightwalletdClient::connect(lightwalletd_url).await?;
        Ok(Self {
            client,
            viewing_key,
            spending_key,
        })
    }

    /// Get current block height (to verify connection works)
    pub async fn get_height(&self) -> Result<u64> {
        let mut client = self.client.clone();
        client.get_latest_block().await
    }

    /// Scan latest N blocks for incoming memos
    pub async fn scan(&self, num_blocks: u64) -> Result<Vec<IncomingMemo>> {
        let mut client = self.client.clone();
        let latest = client.get_latest_block().await?;
        let start = latest.saturating_sub(num_blocks);

        let blocks = client.get_block_range(start, latest).await?;

        // TODO: Decrypt outputs using self.viewing_key
        // For now just return empty to prove connection works
        println!("Scanned {} blocks ({} to {})", blocks.len(), start, latest);

        Ok(vec![])
    }

    /// Get the viewing key
    pub fn viewing_key(&self) -> &str {
        &self.viewing_key
    }

    /// Get the spending key
    pub fn spending_key(&self) -> &str {
        &self.spending_key
    }
}
