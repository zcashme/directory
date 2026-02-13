//! ZVS - Zcash Verification Service runner

use std::env;
use std::path::PathBuf;
use std::time::Duration;
use tracing_subscriber::EnvFilter;
use zvs::ZVS;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    dotenvy::dotenv().ok();

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .init();

    let url = env::var("LIGHTWALLETD_URL").unwrap_or_else(|_| "https://zec.rocks:443".to_string());
    let seed_hex = env::var("SEED_HEX").expect("SEED_HEX required");
    let otp_secret_hex = env::var("OTP_SECRET").expect("OTP_SECRET required (hex-encoded)");
    let birthday_height: u32 = env::var("BIRTHDAY_HEIGHT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);
    let data_dir = env::var("ZVS_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./zvs_data"));
    let poll_interval: u64 = env::var("POLL_INTERVAL")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(30);

    let seed = hex::decode(&seed_hex)?;
    let otp_secret = hex::decode(&otp_secret_hex)?;

    println!("ZVS - Zcash Verification Service");
    println!("=================================");
    println!("Lightwalletd: {}", url);
    println!("Birthday height: {}", birthday_height);
    println!("Poll interval: {}s", poll_interval);
    println!();

    let mut zvs = ZVS::connect(&url, &seed, birthday_height, &data_dir, otp_secret).await?;

    match zvs.get_address() {
        Ok(address) => println!("Wallet address: {}", address),
        Err(e) => println!("Could not get address: {}", e),
    }
    println!();

    println!("Starting ZVS runner...");
    println!("Press Ctrl+C to stop");
    println!();

    let poll_duration = Duration::from_secs(poll_interval);
    tokio::select! {
        result = zvs.monitor_loop(poll_duration) => {
            if let Err(e) = result {
                eprintln!("Runner error: {}", e);
            }
        }
        _ = tokio::signal::ctrl_c() => {
            println!("\nShutting down...");
        }
    }

    Ok(())
}
