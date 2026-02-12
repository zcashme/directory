# Zcash OTP Verifier - Rust Crate

A stateless Zcash verification service library that connects to lightwalletd for memo-based verification.

## Status: 🚧 In Development

### ✅ Completed
- [x] Project structure
- [x] Deterministic OTP generation (HMAC-SHA256 based)
- [x] lightwalletd gRPC client skeleton
- [x] Memo scanner interface
- [x] Transaction builder interface
- [x] Protobuf definitions

### 🚧 In Progress
- [ ] Transaction building with zcash_primitives
- [ ] Memo decryption using viewing keys
- [ ] Full Sapling transaction support

### 📋 TODO
- [ ] Proof generation (spending/output proofs)
- [ ] UTXO management
- [ ] Change output handling
- [ ] HTTP server example
- [ ] Integration tests with testnet
- [ ] Documentation

## Architecture

```
Your App → zcash-otp-verifier → lightwalletd → zebrad
```

## Core Modules

### 1. `crypto` - Deterministic OTP Generation ✅

```rust
use zcash_otp_verifier::generate_otp;

let otp = generate_otp("txid_abc123", b"secret-key");
// Returns: "MFRGGZDF2Q" (10-char base32)
```

**Properties:**
- Deterministic: Same txid → same OTP
- Collision-resistant: Different txids → different OTPs
- One-way: Can't derive txid from OTP
- Secret-dependent: Requires secret key

### 2. `client` - lightwalletd gRPC Client ✅

```rust
use zcash_otp_verifier::LightwalletdClient;

let mut client = LightwalletdClient::connect("http://localhost:9067").await?;

// Get latest block
let height = client.get_latest_block().await?;

// Get specific transaction
let tx = client.get_transaction("abc123...").await?;

// Send raw transaction
client.send_raw_transaction(raw_tx_bytes).await?;
```

### 3. `memo` - Memo Scanning 🚧

```rust
use zcash_otp_verifier::MemoScanner;

let scanner = MemoScanner::new(client, viewing_key, admin_address)?;

// Scan latest 100 blocks
let memos = scanner.scan_latest(100).await?;

for memo in memos {
    println!("From: {}, Memo: {}", memo.from_address?, memo.memo);
}
```

**TODO:** Implement memo decryption using `zcash_primitives`

### 4. `transaction` - Transaction Building 🚧

```rust
use zcash_otp_verifier::TransactionBuilder;

let builder = TransactionBuilder::new(spending_key, client)?;

// Send OTP
let txid = builder.send_otp("zs1recipient...", "AB12CD").await?;
```

**TODO:** Implement transaction building, proof generation, signing

## High-Level API ✅

```rust
use zcash_otp_verifier::OtpVerifier;

#[tokio::main]
async fn main() -> Result<()> {
    let verifier = OtpVerifier::connect(
        "http://localhost:9067",
        viewing_key,
        spending_key,
        admin_address,
    ).await?;

    // Scan for verification requests
    let memos = verifier.scan_incoming().await?;

    for memo in memos {
        // Generate deterministic OTP from txid
        let otp = generate_otp(&memo.txid, SECRET_KEY);

        // Send OTP back
        verifier.send_memo(&memo.from_address?, &format!("OTP:{}", otp)).await?;
    }

    Ok(())
}
```

## What's Missing

### 1. Transaction Building (Critical)

Currently stubbed. Needs implementation using `zcash_primitives`:

```rust
use zcash_primitives::transaction::builder::Builder;
use zcash_primitives::transaction::components::Amount;
use zcash_primitives::zip32::ExtendedSpendingKey;

// Parse spending key
let spending_key = ExtendedSpendingKey::from_str(key_str)?;

// Build transaction
let mut builder = Builder::new(MainNetwork);

// Add inputs (UTXOs)
builder.add_sapling_spend(extsk, diversifier, note, merkle_path)?;

// Add outputs
builder.add_sapling_output(
    ovk,
    to_address,
    Amount::from_u64(amount)?,
    Some(memo),
)?;

// Generate proofs and sign
let (tx, _) = builder.build(prover)?;

// Serialize and send
let raw_tx = tx.serialize();
client.send_raw_transaction(raw_tx).await?;
```

**Challenges:**
- UTXO management (need to track notes)
- Proof generation (requires zcash_proofs parameters)
- Change output calculation
- Fee calculation

### 2. Memo Decryption (Critical)

Currently stubbed. Needs implementation:

```rust
use zcash_primitives::sapling::note_encryption::try_sapling_note_decryption;

for output in compact_tx.outputs {
    let decrypted = try_sapling_note_decryption(
        &viewing_key,
        &output,
    );

    if let Some((note, to, memo)) = decrypted {
        if to == admin_address {
            // Found memo to admin wallet
            let memo_text = std::str::from_utf8(&memo.0)?;
            // Store memo
        }
    }
}
```

### 3. Protobuf Generation

The protobuf files need to be compiled:

```bash
cargo build
```

This will generate the gRPC client code in `target/` via `build.rs`.

**Note:** May need to adjust proto definitions to match actual lightwalletd API.

## Testing

Currently only unit tests for deterministic OTP:

```bash
cargo test
```

**TODO:**
- Integration tests with testnet
- Mock lightwalletd for testing
- Transaction building tests

## Usage Example (When Complete)

```rust
use zcash_otp_verifier::{OtpVerifier, generate_otp};

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to lightwalletd
    let verifier = OtpVerifier::connect(
        "http://localhost:9067",
        env::var("VIEWING_KEY")?,
        env::var("SPENDING_KEY")?,
        env::var("ADMIN_ADDRESS")?,
    ).await?;

    // Scan for new verification requests
    let memos = verifier.scan_incoming().await?;

    for memo in memos {
        println!("New verification from: {}", memo.from_address?);
        println!("Memo: {}", memo.memo);

        // Generate OTP from txid (deterministic, no database)
        let otp = generate_otp(&memo.txid, SECRET_KEY);

        // Send OTP back via blockchain
        let response_txid = verifier
            .send_memo(&memo.from_address?, &format!("OTP:{}", otp))
            .await?;

        println!("Sent OTP in tx: {}", response_txid);
    }

    Ok(())
}
```

## Dependencies

```toml
tokio = "1.35"           # Async runtime
tonic = "0.11"           # gRPC
zcash_primitives = "0.15" # Zcash crypto
zcash_proofs = "0.15"     # Proof generation
hmac = "0.12"            # OTP generation
sha2 = "0.10"            # Hashing
base32 = "0.4"           # OTP encoding
```

## Next Steps

1. **Implement transaction building**
   - Parse spending keys
   - Build Sapling transactions
   - Generate proofs
   - Handle UTXOs and change

2. **Implement memo decryption**
   - Use viewing key to decrypt outputs
   - Extract memo text
   - Filter by admin address

3. **Create HTTP server example**
   - `/scan` - Scan for new memos
   - `/send-otp` - Send OTP response
   - `/verify-tx` - Verify transaction exists

4. **Test on testnet**
   - End-to-end verification flow
   - Real blockchain interaction
   - Performance testing

## References

- [zcash_primitives docs](https://docs.rs/zcash_primitives)
- [lightwalletd gRPC](https://github.com/zcash/lightwalletd)
- [Stateless verification architecture](./STATELESS_VERIFICATION.md)

## Current Build Status

```bash
cargo build
```

**Expected:** Compiles successfully with TODOs in place for transaction building and memo decryption.

The core structure is ready - just need to implement the Zcash-specific crypto operations.
