use std::env;
use std::path::PathBuf;
use tracing_subscriber::EnvFilter;
use zvs::ZVS;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let url = env::var("LIGHTWALLETD_URL").unwrap_or_else(|_| "https://zec.rocks:443".to_string());
    let seed_hex = env::var("SEED_HEX").expect("SEED_HEX required");
    let birthday_height: u32 = env::var("BIRTHDAY_HEIGHT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);
    let data_dir = env::var("ZVS_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./zvs_data"));

    let seed = hex::decode(&seed_hex)?;

    println!("ZVS - Zcash Verification Service");
    println!("=================================");
    println!("Connecting to: {}", url);
    println!("Birthday: {}", birthday_height);

    let mut zvs = ZVS::connect(&url, &seed, birthday_height, &data_dir).await?;

    // Show wallet address
    match zvs.get_address() {
        Ok(address) => println!("Wallet address: {}", address),
        Err(e) => println!("Could not get address: {}", e),
    }

    println!("Syncing...");
    zvs.sync().await?;

    // Show balance after sync
    match zvs.get_balance() {
        Ok(balance) => {
            println!("Balance:");
            println!("  Total: {} zatoshis", balance.total);
            println!("  Sapling spendable: {} zatoshis", balance.sapling_spendable);
            println!("  Orchard spendable: {} zatoshis", balance.orchard_spendable);
        }
        Err(e) => println!("Could not get balance: {}", e),
    }

    println!("Done!");
    Ok(())
}
