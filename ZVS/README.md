# ZVS - Zcash Verification Service

A stateless Zcash verification service built in Rust. Uses the blockchain as the source of truth for identity verification with deterministic OTP generation.

## Architecture

```
User Wallet → Z→Z tx with memo → Admin Wallet
                                      ↓
                        ZVS scans via lightwalletd
                                      ↓
                          Parse memo: {z:15,b:"bio"}
                                      ↓
                          Generate deterministic OTP
                                      ↓
                          Send OTP back via memo
                                      ↓
                          User confirms → Verified ✓
```

## Key Features

✅ **Stateless** - Blockchain is the database, no verification tables needed
✅ **Deterministic OTPs** - HMAC-based, recomputable from txid
✅ **Secure** - Uses official zcash_primitives library
✅ **Simple** - Single `lib.rs` file (~515 lines)
✅ **Well-tested** - Complete test suite included

## Project Structure

```
ZVS/
├── src/
│   └── lib.rs              # Complete implementation (single file!)
├── proto/
│   ├── service.proto       # lightwalletd gRPC API
│   └── compact_formats.proto
├── examples/
│   └── basic_usage.rs      # Usage examples
├── Cargo.toml
└── README.md
```

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
zvs = { path = "../ZVS" }  # Or publish to crates.io
tokio = { version = "1.35", features = ["full"] }
```

## Quick Start

```rust
use zvs::ZVS;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to lightwalletd
    let mut zvs = ZVS::connect(
        "http://localhost:9067",
        viewing_key,
        spending_key,
    ).await?;

    // Scan for verification requests
    let memos = zvs.scan_incoming(100).await?;

    // Generate OTP for a transaction
    let otp = zvs.generate_otp("txid_abc123", b"secret-key");

    // Verify user's OTP
    if zvs.verify_otp("txid_abc123", &otp, b"secret-key") {
        println!("✓ Verified!");
    }

    Ok(())
}
```

## Examples

Run the included example:

```bash
cargo run --example basic_usage
```

Output:
```
ZVS - Zcash Verification Service

=== OTP Generation ===
Transaction ID: abc123deadbeef456
Generated OTP:  CHBHIADP6A
OTP Length:     10 chars

✓ OTP is deterministic (same input = same output)
✓ Different txids produce different OTPs
...
```

## API Reference

### Main Functions

#### `ZVS::connect(url, viewing_key, spending_key)`
Connect to lightwalletd server.

#### `zvs.scan_incoming(num_blocks)`
Scan last N blocks for incoming memos.
⚠️ **Note:** Decryption not yet implemented - returns empty vec.

#### `zvs.get_transaction(txid)`
Get transaction details by txid (for verification).

#### `zvs.generate_otp(txid, secret)`
Generate deterministic OTP from txid using HMAC-SHA256.

```rust
let otp = zvs.generate_otp("abc123", b"my-secret");
// Returns: "MFRGGZDF2Q" (10 chars, base32 encoded)
```

#### `zvs.verify_otp(txid, otp, secret)`
Verify user's OTP against expected value.

```rust
let is_valid = zvs.verify_otp("abc123", "MFRGGZDF2Q", b"my-secret");
```

#### `zvs.parse_verification_memo(memo)`
Parse memo format: `{"z":15,"b":"bio","n":"name"}`

### Standalone Functions

#### `zvs::generate_otp(txid, secret)`
Generate OTP without ZVS instance.

#### `zvs::verify_otp(txid, otp, secret)`
Verify OTP without ZVS instance.

#### `zvs::parse_verification_memo(memo)`
Parse JSON memo format.

#### `zvs::parse_otp_memo(memo)`
Parse OTP memo format: `"OTP:MFRGGZDF2Q"`

## How It Works

### Stateless Verification

Traditional systems store OTPs in a database. ZVS uses HMAC to make OTPs **deterministic**:

```rust
// Traditional (needs database)
let otp = random_6_digit();
database.insert(txid, hash(otp));

// ZVS (stateless)
let otp = hmac_sha256(SECRET_KEY, txid);
// Can recompute anytime, no storage needed!
```

### OTP Security

**HMAC properties:**
- ✅ Deterministic: Same txid → same OTP
- ✅ Secret-dependent: Need SECRET_KEY to generate valid OTPs
- ✅ One-way: Can't reverse engineer txid from OTP
- ✅ Collision-resistant: Different txids → different OTPs

**Security guarantee:** Without SECRET_KEY, attackers cannot:
- Generate valid OTPs for new transactions
- Reverse engineer the secret from seen OTPs
- Predict future OTPs

## Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_otp_generation_deterministic

# Run with output
cargo test -- --nocapture
```

All tests pass:
```
running 6 tests
test tests::test_connect ... ignored
test tests::test_parse_verification_memo ... ok
test tests::test_parse_otp_memo ... ok
test tests::test_otp_generation_different_txids ... ok
test tests::test_otp_verification ... ok
test tests::test_otp_generation_deterministic ... ok

test result: ok. 5 passed; 0 failed; 1 ignored
```

## TODO

### High Priority

- [ ] **Memo decryption** - Implement using `zcash_primitives`
  - Parse viewing key
  - Decrypt Sapling outputs
  - Extract memo text, sender, amount

- [ ] **Transaction building** - Send OTP responses
  - Parse spending key
  - Build shielded transactions
  - Generate proofs
  - Sign and broadcast

### Medium Priority

- [ ] **Block timestamp parsing** - For expiration checks
- [ ] **Full transaction details** - Parse raw tx bytes
- [ ] **HTTP server example** - FastAPI-like REST endpoints
- [ ] **Documentation** - Add rustdoc examples

### Low Priority

- [ ] **Error handling improvements** - Better error messages
- [ ] **Logging** - Add tracing/logging
- [ ] **Metrics** - Performance monitoring
- [ ] **Orchard support** - Beyond Sapling

## Dependencies

```toml
tokio = "1.35"              # Async runtime
tonic = "0.11"              # gRPC client
zcash_primitives = "0.15"   # Zcash crypto (TODO: use in decryption)
hmac = "0.12"               # OTP generation
sha2 = "0.10"               # Hashing
base32 = "0.4"              # OTP encoding
serde = "1.0"               # Serialization
```

## Why This Architecture?

### Blockchain as Database

The transaction itself contains everything needed:

```
Transaction on blockchain:
├─ txid (unique ID) ────────→ For OTP generation
├─ timestamp ───────────────→ For expiration
├─ from_address ────────────→ User identity
├─ to_address ──────────────→ Proves sent to admin
├─ amount ──────────────────→ Sybil resistance
└─ memo ────────────────────→ Verification data
```

**Eliminates:**
- ❌ `verification_codes` table
- ❌ `pending_edits` table
- ❌ `transactions` table

**Minimal state:** Just `last_verification_txid` per user (prevents replay)

## Related Documentation

- [STATELESS_VERIFICATION.md](./STATELESS_VERIFICATION.md) - Architecture details
- [verification.md](./verification.md) - Full system design
- [ARCHITECTURE.md](./ARCHITECTURE.md) - VM infrastructure

## License

MIT License - See LICENSE file

## Author

Jules (jules@zcash.me)
