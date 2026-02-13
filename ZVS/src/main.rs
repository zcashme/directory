use std::env;
use std::path::PathBuf;
use std::time::Duration;
use tracing_subscriber::EnvFilter;
use zvs::ZVS;

const HELP: &str = r#"
ZVS - Zcash Verification Service

USAGE:
    zvs [COMMAND]

COMMANDS:
    sync      Sync wallet and show balance (default)
    monitor   Start real-time block monitoring
    memos     Show all received memos
    help      Show this help message

ENVIRONMENT:
    LIGHTWALLETD_URL   gRPC endpoint (default: https://zec.rocks:443)
    SEED_HEX           Wallet seed as hex (required)
    BIRTHDAY_HEIGHT    Block height when wallet was created (default: 1)
    ZVS_DATA_DIR       Data directory (default: ./zvs_data)
    RUST_LOG           Log level (default: info)
    POLL_INTERVAL      Monitor poll interval in seconds (default: 30)
"#;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    dotenvy::dotenv().ok();

    // Parse command
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("sync");

    if command == "help" || command == "--help" || command == "-h" {
        println!("{}", HELP);
        return Ok(());
    }

    // Initialize logging
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .init();

    // Load config from environment
    let url = env::var("LIGHTWALLETD_URL").unwrap_or_else(|_| "https://zec.rocks:443".to_string());
    let seed_hex = env::var("SEED_HEX").expect("SEED_HEX required");
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

    println!("ZVS - Zcash Verification Service");
    println!("=================================");
    println!("Command: {}", command);
    println!("Lightwalletd: {}", url);
    println!("Birthday: {}", birthday_height);
    println!();

    let mut zvs = ZVS::connect(&url, &seed, birthday_height, &data_dir).await?;

    // Show wallet address
    match zvs.get_address() {
        Ok(address) => println!("Wallet address: {}", address),
        Err(e) => println!("Could not get address: {}", e),
    }
    println!();

    match command {
        "sync" => {
            println!("Syncing...");
            zvs.sync().await?;

            // Show balance after sync
            match zvs.get_balance() {
                Ok(balance) => {
                    println!();
                    println!("Balance:");
                    println!("  Total:            {} ZEC", format_zec(balance.total));
                    println!("  Sapling spendable: {} ZEC", format_zec(balance.sapling_spendable));
                    println!("  Orchard spendable: {} ZEC", format_zec(balance.orchard_spendable));
                }
                Err(e) => println!("Could not get balance: {}", e),
            }

            println!();
            println!("Done!");
        }

        "monitor" => {
            println!("Starting real-time block monitoring...");
            println!("Poll interval: {}s", poll_interval);
            println!("Press Ctrl+C to stop");
            println!();

            // Handle Ctrl+C gracefully
            let poll_duration = Duration::from_secs(poll_interval);
            tokio::select! {
                result = zvs.monitor_loop(poll_duration) => {
                    if let Err(e) = result {
                        eprintln!("Monitor error: {}", e);
                    }
                }
                _ = tokio::signal::ctrl_c() => {
                    println!("\nShutting down...");
                }
            }
        }

        "memos" => {
            println!("Syncing to get latest notes...");
            zvs.sync().await?;

            println!();
            println!("Received Notes:");
            println!("===============");

            match zvs.get_received_memos().await {
                Ok(memos) => {
                    if memos.is_empty() {
                        println!("No memos found.");
                    } else {
                        for memo in memos {
                            println!();
                            println!("TX: {}", memo.txid_hex);
                            println!("Height: {}", memo.height);
                            println!("Value: {} ZEC", format_zec(memo.value_zats));
                            println!("Memo: {}", memo.memo);
                            if let Some(ref v) = memo.verification {
                                println!("  -> ZVS Request: session={}, reply_to={}", v.session_id, v.user_address);
                            }
                        }
                    }
                }
                Err(e) => println!("Error fetching memos: {}", e),
            }
        }

        _ => {
            eprintln!("Unknown command: {}", command);
            eprintln!("Run 'zvs help' for usage information.");
            std::process::exit(1);
        }
    }

    Ok(())
}

/// Format zatoshis as ZEC with 8 decimal places
fn format_zec(zats: u64) -> String {
    let zec = zats as f64 / 100_000_000.0;
    format!("{:.8}", zec)
}
