mod memo_rules;

use std::env;
use tracing_subscriber::EnvFilter;
use zvs::ZVS;

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
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let args: Vec<String> = env::args().collect();

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

    let zvs = ZVS::connect(&url, &seed, birthday_height).await?;

    let address = zvs.get_address().await?;
    println!("Wallet address: {}", address);
    println!();
    println!("Wallet initialized. Ready to build sync/send functionality.");

    Ok(())
}
