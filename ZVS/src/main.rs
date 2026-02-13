//! ZVS CLI - Zcash Verification Service

use std::env;
use std::time::Duration;
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
    eprintln!();
    eprintln!("Example:");
    eprintln!("  zvs https://mainnet.lightwalletd.com:9067 0123456789abcdef... 2000000");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

    // Main loop - sync periodically and check for verification requests
    loop {
        tokio::time::sleep(Duration::from_secs(30)).await;

        let height = match zvs.height().await {
            Ok(h) => h,
            Err(e) => {
                eprintln!("Error fetching height: {}", e);
                continue;
            }
        };

        println!("[Block {}] Syncing...", height);

        if let Err(e) = zvs.sync().await {
            eprintln!("Sync error: {}", e);
            continue;
        }

        let balance = zvs.balance().await.unwrap_or(0);
        println!(
            "Balance: {} ZAT ({:.8} ZEC)",
            balance,
            balance as f64 / 100_000_000.0
        );

        // TODO: Process incoming memos for verification requests
        // For now, just show that we're running
    }
}
