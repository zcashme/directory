//! ZVS CLI - Realtime scanner for Zcash verification service

use std::env;
use std::time::Duration;
use zvs::ZVS;

fn print_usage() {
    eprintln!("Usage: zvs <lightwalletd_url> <viewing_key> [num_blocks]");
    eprintln!();
    eprintln!("Arguments:");
    eprintln!("  lightwalletd_url  gRPC endpoint (e.g., https://mainnet.lightwalletd.com:9067)");
    eprintln!("  viewing_key       Sapling extended full viewing key (zxviews1...)");
    eprintln!("  num_blocks        Number of recent blocks to scan (default: 100)");
    eprintln!();
    eprintln!("Environment variables (alternative to args):");
    eprintln!("  LIGHTWALLETD_URL");
    eprintln!("  VIEWING_KEY");
    eprintln!("  NUM_BLOCKS");
    eprintln!();
    eprintln!("Example:");
    eprintln!("  zvs https://mainnet.lightwalletd.com:9067 zxviews1q... 1000");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();

    // Get config from args or env
    let url = args.get(1)
        .map(String::as_str)
        .or_else(|| env::var("LIGHTWALLETD_URL").ok().as_deref().map(|_| ""))
        .map(|s| if s.is_empty() { env::var("LIGHTWALLETD_URL").unwrap() } else { s.to_string() });

    let viewing_key = args.get(2)
        .map(String::as_str)
        .or_else(|| env::var("VIEWING_KEY").ok().as_deref().map(|_| ""))
        .map(|s| if s.is_empty() { env::var("VIEWING_KEY").unwrap() } else { s.to_string() });

    let num_blocks: u32 = args.get(3)
        .and_then(|s| s.parse().ok())
        .or_else(|| env::var("NUM_BLOCKS").ok().and_then(|s| s.parse().ok()))
        .unwrap_or(100);

    let (url, viewing_key) = match (url, viewing_key) {
        (Some(u), Some(v)) => (u, v),
        _ => {
            print_usage();
            std::process::exit(1);
        }
    };

    println!("ZVS - Zcash Verification Service (Realtime)");
    println!("=============================================");
    println!();
    println!("Connecting to: {}", url);

    // Connect
    let mut zvs = ZVS::connect(&url, &viewing_key).await?;

    // Initial scan of recent blocks
    let mut last_scanned = zvs.height().await?;
    let start = last_scanned.saturating_sub(num_blocks);

    println!("Current chain height: {}", last_scanned);
    println!("Initial scan: {} - {}", start, last_scanned);
    println!();

    let memos = zvs.scan_range(start, last_scanned).await?;
    print_memos(&memos, "initial scan");

    println!("Watching for new blocks...");
    println!();

    // Realtime loop
    loop {
        tokio::time::sleep(Duration::from_secs(30)).await;

        let latest = match zvs.height().await {
            Ok(h) => h,
            Err(e) => {
                eprintln!("Error fetching height: {}", e);
                continue;
            }
        };

        if latest > last_scanned {
            println!("[Block {}] New block(s) detected: {} -> {}", latest, last_scanned, latest);

            match zvs.scan_range(last_scanned + 1, latest).await {
                Ok(memos) => {
                    print_memos(&memos, &format!("blocks {}-{}", last_scanned + 1, latest));
                    last_scanned = latest;
                }
                Err(e) => {
                    eprintln!("Error scanning blocks: {}", e);
                }
            }
        }
    }
}

fn print_memos(memos: &[zvs::Memo], context: &str) {
    if memos.is_empty() {
        println!("No memos found in {}.", context);
    } else {
        println!("Found {} memo(s) in {}:", memos.len(), context);
        println!();
        for (i, memo) in memos.iter().enumerate() {
            println!("--- Memo {} ---", i + 1);
            println!("  TxID:   {}", memo.txid);
            println!("  Height: {}", memo.height);
            println!("  Amount: {} ZAT ({:.8} ZEC)", memo.amount, memo.amount as f64 / 100_000_000.0);
            println!("  Memo:   {}", memo.text);
            println!();
        }
    }
}
