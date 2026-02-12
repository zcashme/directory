//! Incoming memo representation

use serde::{Deserialize, Serialize};

/// An incoming memo from the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomingMemo {
    /// Transaction ID (hex)
    pub txid: String,
    /// Block height
    pub height: u64,
    /// Sender's address (if known)
    pub from_address: Option<String>,
    /// Amount in zatoshis
    pub amount: u64,
    /// Decrypted memo text
    pub memo: String,
}
