//! ZVS CLI - Zcash Verification Service
//!
//! This service monitors the Zcash blockchain for verification requests sent to the
//! admin wallet. When a valid verification memo is received, it responds with an OTP.

mod memo_rules;

use std::env;
use std::time::Duration;
use tracing::{info, warn, error};
use tracing_subscriber::EnvFilter;
use zvs::{ReceivedMemo, ZVS};

fn print_usage() {
    eprintln!("Usage: zvs <lightwalletd_url> <seed_hex> <birthday_height>");
    eprintln!();
    eprintln!("Arguments:");
    eprintln!("  lightwalletd_url  gRPC endpoint (e.g., https://mainnet.lightwalletd.com:9067)");
    eprintln!("  seed_hex          32-byte seed as hex (64 characters)");
    eprintln!("  birthday_height   Block height when wallet was created");
    eprintln!();
    eprintln!("Environment variables (alternative to args):");
    eprintln!("  LIGHTWALLETD_URL");
    eprintln!("  SEED_HEX");
    eprintln!("  BIRTHDAY_HEIGHT");
    eprintln!();
    eprintln!("Example:");
    eprintln!("  zvs https://mainnet.lightwalletd.com:9067 0123456789abcdef... 2000000");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Install rustls crypto provider (required for TLS connections)
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    // Load .env file if present
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let args: Vec<String> = env::args().collect();

    // Get config from args or env
    let url = args
        .get(1)
        .cloned()
        .or_else(|| env::var("LIGHTWALLETD_URL").ok());

    let seed_hex = args
        .get(2)
        .cloned()
        .or_else(|| env::var("SEED_HEX").ok());

    let birthday_height: Option<u32> = args
        .get(3)
        .and_then(|s| s.parse().ok())
        .or_else(|| env::var("BIRTHDAY_HEIGHT").ok().and_then(|s| s.parse().ok()));

    let (url, seed_hex, birthday_height) = match (url, seed_hex, birthday_height) {
        (Some(u), Some(s), Some(b)) => (u, s, b),
        _ => {
            print_usage();
            std::process::exit(1);
        }
    };

    // Decode seed from hex
    let seed = hex::decode(&seed_hex).map_err(|e| format!("Invalid seed hex: {e}"))?;
    if seed.len() < 32 {
        eprintln!("Seed must be at least 32 bytes (64 hex characters)");
        std::process::exit(1);
    }

    println!("ZVS - Zcash Verification Service");
    println!("=================================");
    println!();
    println!("Connecting to: {}", url);
    println!("Birthday height: {}", birthday_height);

    // Connect and initialize wallet
    let mut zvs = ZVS::connect(&url, &seed, birthday_height).await?;

    // Get wallet address
    let address = zvs.get_address().await?;
    println!("Wallet address: {}", address);
    println!();

    // Initial sync
    println!("Syncing wallet...");
    zvs.sync().await?;

    let balance = zvs.balance().await?;
    println!(
        "Balance: {} ZAT ({:.8} ZEC)",
        balance,
        balance as f64 / 100_000_000.0
    );
    println!();

    println!("Watching for new blocks...");
    println!("(Verification requests should be sent as memos to the wallet address above)");
    println!();

    // Track the last processed height to avoid reprocessing memos
    let mut last_processed_height = birthday_height;

    // Main loop - sync periodically and check for verification requests
    loop {
        tokio::time::sleep(Duration::from_secs(30)).await;

        let height = match zvs.height().await {
            Ok(h) => h,
            Err(e) => {
                error!("Error fetching height: {}", e);
                continue;
            }
        };

        info!("[Block {}] Syncing...", height);

        if let Err(e) = zvs.sync().await {
            error!("Sync error: {}", e);
            continue;
        }

        let balance = zvs.balance().await.unwrap_or(0);
        info!(
            "Balance: {} ZAT ({:.8} ZEC)",
            balance,
            balance as f64 / 100_000_000.0
        );

        // Process incoming memos for verification requests
        match zvs.get_received_memos(last_processed_height).await {
            Ok(memos) => {
                if !memos.is_empty() {
                    info!("Found {} memos to process", memos.len());
                }
                for memo in memos {
                    process_verification_request(&mut zvs, &memo).await;
                    // Update last processed height to avoid reprocessing
                    if memo.height > last_processed_height {
                        last_processed_height = memo.height;
                    }
                }
            }
            Err(e) => {
                error!("Failed to get received memos: {}", e);
            }
        }
    }
}

/// Process a single verification request from a received memo.
///
/// This function:
/// 1. Validates the memo format using memo_rules
/// 2. If valid, generates an OTP
/// 3. Sends the OTP back to the user's address
async fn process_verification_request(zvs: &mut ZVS, memo: &ReceivedMemo) {
    info!(
        "Received memo in tx {} at height {}: {}",
        memo.txid, memo.height, memo.memo
    );

    // Validate the memo and extract verification data
    let verification_data = match memo_rules::validate_memo(&memo.memo) {
        Some(data) => data,
        None => {
            warn!("Invalid memo format, skipping: {}", memo.memo);
            return;
        }
    };

    info!(
        "Valid verification request from {} (session: {})",
        verification_data.user_address, verification_data.session_id
    );

    // Generate OTP for this session
    let otp = zvs.generate_otp(&verification_data.session_id, &verification_data.user_address);
    info!("Generated OTP {} for session {}", otp, verification_data.session_id);

    // Send OTP back to user's address
    // Amount: 1000 zatoshis (0.00001 ZEC) - minimal dust amount
    let otp_memo = format!("ZVS-OTP:{}", otp);

    match zvs.send(&verification_data.user_address, 1000, &otp_memo).await {
        Ok(txid) => {
            info!(
                "Sent OTP to {} in tx {}",
                verification_data.user_address, txid
            );
        }
        Err(e) => {
            error!(
                "Failed to send OTP to {}: {}",
                verification_data.user_address, e
            );
        }
    }
}
