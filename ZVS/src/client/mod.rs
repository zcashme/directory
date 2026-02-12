///! lightwalletd gRPC client

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tonic::transport::Channel;

// Generated protobuf code
pub mod proto {
    tonic::include_proto!("cash.z.wallet.sdk.rpc");
}

use proto::{
    compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec, TxFilter,
};

/// Client for communicating with lightwalletd
#[derive(Clone)]
pub struct LightwalletdClient {
    client: CompactTxStreamerClient<Channel>,
}

/// Transaction details from blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxDetails {
    pub txid: String,
    pub height: u64,
    pub timestamp: i64,
    pub to_address: Option<String>,
    pub from_address: Option<String>,
    pub amount: u64,
    pub memo: Option<String>,
    pub exists: bool,
}

impl LightwalletdClient {
    /// Connect to lightwalletd server
    ///
    /// ## Example
    /// ```no_run
    /// use zcash_otp_verifier::LightwalletdClient;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let client = LightwalletdClient::connect("http://localhost:9067").await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn connect(url: &str) -> Result<Self> {
        let client = CompactTxStreamerClient::connect(url.to_string())
            .await
            .map_err(|e| anyhow!("Failed to connect to lightwalletd: {}", e))?;

        Ok(Self { client })
    }

    /// Get latest block height
    pub async fn get_latest_block(&mut self) -> Result<u64> {
        let chain_spec = ChainSpec {};
        let response = self
            .client
            .get_latest_block(chain_spec)
            .await
            .map_err(|e| anyhow!("Failed to get latest block: {}", e))?;

        Ok(response.into_inner().height)
    }

    /// Get specific transaction by txid
    pub async fn get_transaction(&mut self, txid: &str) -> Result<TxDetails> {
        let tx_hash = hex::decode(txid)
            .map_err(|e| anyhow!("Invalid txid hex: {}", e))?;

        let filter = TxFilter { hash: tx_hash };

        let response = self
            .client
            .get_transaction(filter)
            .await
            .map_err(|e| anyhow!("Transaction not found: {}", e))?;

        let raw_tx = response.into_inner();

        // TODO: Parse raw transaction bytes to extract details
        // For now, return basic structure
        Ok(TxDetails {
            txid: txid.to_string(),
            height: raw_tx.height,
            timestamp: 0, // TODO: Get from block header
            to_address: None,
            from_address: None,
            amount: 0,
            memo: None,
            exists: true,
        })
    }

    /// Send raw transaction to network
    pub async fn send_raw_transaction(&mut self, tx_data: Vec<u8>) -> Result<String> {
        let raw_tx = proto::RawTransaction {
            data: tx_data,
            height: 0,
        };

        let response = self
            .client
            .send_transaction(raw_tx)
            .await
            .map_err(|e| anyhow!("Failed to send transaction: {}", e))?;

        let send_response = response.into_inner();

        if send_response.error_code != 0 {
            return Err(anyhow!(
                "Transaction rejected: {}",
                send_response.error_message
            ));
        }

        Ok("Transaction sent successfully".to_string())
    }

    /// Get range of blocks for scanning
    pub async fn get_block_range(&mut self, start: u64, end: u64) -> Result<Vec<proto::CompactBlock>> {
        let range = BlockRange {
            start: Some(BlockId {
                height: start,
                hash: vec![],
            }),
            end: Some(BlockId {
                height: end,
                hash: vec![],
            }),
        };

        let mut stream = self
            .client
            .get_block_range(range)
            .await
            .map_err(|e| anyhow!("Failed to get block range: {}", e))?
            .into_inner();

        let mut blocks = Vec::new();
        while let Some(block) = stream
            .message()
            .await
            .map_err(|e| anyhow!("Stream error: {}", e))?
        {
            blocks.push(block);
        }

        Ok(blocks)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires running lightwalletd
    async fn test_connect() {
        let result = LightwalletdClient::connect("http://localhost:9067").await;
        assert!(result.is_ok());
    }
}
