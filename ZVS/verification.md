# Zcash Memo Verifier - Rust Library Plan

## Purpose

A **Rust library and reference implementation** for Zcash-based identity verification and signed message systems using shielded memos.

Instead of replacing lightwalletd (trust issue), this is a **standalone service** that:
- Talks to official lightwalletd via gRPC
- Scans for verification memos sent to an admin address
- Parses structured memo data
- Sends verification responses (OTPs) via shielded transactions
- Provides HTTP API for web applications

## What This Library Does

```
User Wallet → Z→Z tx with memo → Admin Wallet
                                      ↓
                    zcash-memo-verifier scans via lightwalletd
                                      ↓
                            Parse memo: {z:15,b:"New bio"}
                                      ↓
                            Store pending verification
                                      ↓
                      Build Z→Z response with OTP memo
                                      ↓
                            User confirms OTP
                                      ↓
                            Verification complete
```

**Core functionality:**
1. **Memo scanning** - Connect to lightwalletd, scan blocks for incoming memos
2. **Memo parsing** - Extract structured data from memo fields
3. **Transaction building** - Create shielded transactions with memo responses
4. **OTP flow** - Generate, send, and validate one-time passwords
5. **HTTP API** - REST endpoints for web applications to trigger verification

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  User's Node Infrastructure                                │
│                                                             │
│  ┌─────────────┐                                           │
│  │   zebrad    │ ← Official binary (trusted)               │
│  └──────┬──────┘                                           │
│         │                                                   │
│  ┌──────▼─────────┐                                        │
│  │ lightwalletd   │ ← Official binary (trusted)            │
│  └──────┬─────────┘                                        │
│         │ gRPC (port 9067)                                 │
│         │                                                   │
│  ┌──────▼───────────────────────────────┐                  │
│  │  zcash-memo-verifier (Rust)          │ ← Your library   │
│  │                                      │   (open source)  │
│  │  Core Library:                       │                  │
│  │  - lightwalletd gRPC client          │                  │
│  │  - Memo scanning & parsing           │                  │
│  │  - Transaction builder               │                  │
│  │  - Viewing/spending key management   │                  │
│  │                                      │                  │
│  │  HTTP Server (example):              │                  │
│  │  - POST /verify/scan                 │                  │
│  │  - POST /verify/send-otp             │                  │
│  │  - POST /verify/confirm-otp          │                  │
│  └──────────────────────────────────────┘                  │
│         │ HTTP (port 8000)                                 │
└─────────┼──────────────────────────────────────────────────┘
          │
    ┌─────▼────────┐
    │  Web App     │
    │  (Next.js)   │
    └──────────────┘
```

## Trust Model

**Why this is trustworthy:**

1. ✅ **Uses official lightwalletd** - No forked binaries
2. ✅ **Open source** - All code auditable
3. ✅ **Build from source** - Users compile themselves
4. ✅ **Isolated** - Doesn't modify zebrad/lightwalletd
5. ✅ **Read-only gRPC** - Only reads public blockchain data
6. ✅ **Explicit keys** - User provides viewing/spending keys via config
7. ✅ **No key generation** - Doesn't create or export keys

**Worst case scenario:**
- Service crashes → zebrad/lightwalletd keep running
- Service is malicious → Can only access data user explicitly configured

## Project Structure

```
zcash-memo-verifier/
├── Cargo.toml
├── README.md
├── verification.md (this file)
│
├── src/
│   ├── lib.rs              # Public library API
│   │
│   ├── client/
│   │   ├── mod.rs          # lightwalletd gRPC client
│   │   ├── compact_blocks.rs
│   │   └── transactions.rs
│   │
│   ├── memo/
│   │   ├── mod.rs          # Memo parsing
│   │   ├── parser.rs       # Parse {z:15,b:"bio"} format
│   │   └── scanner.rs      # Scan blocks for memos
│   │
│   ├── crypto/
│   │   ├── mod.rs          # Cryptographic operations
│   │   ├── keys.rs         # Viewing/spending key handling
│   │   └── decrypt.rs      # Memo decryption
│   │
│   ├── transaction/
│   │   ├── mod.rs          # Transaction building
│   │   ├── builder.rs      # Create Z→Z txs with memos
│   │   └── sender.rs       # Broadcast via lightwalletd
│   │
│   └── verification/
│       ├── mod.rs          # Verification logic
│       ├── otp.rs          # OTP generation/validation
│       └── state.rs        # Verification state management
│
├── examples/
│   ├── simple_scan.rs      # Basic memo scanning
│   ├── send_memo.rs        # Send a memo transaction
│   └── server.rs           # Full HTTP API server
│
└── tests/
    ├── integration_tests.rs
    └── fixtures/
```

## Core Library Modules

### 1. LightwalletD Client (`src/client/`)

**Purpose:** Connect to lightwalletd via gRPC

```rust
pub struct LightwalletdClient {
    endpoint: String,
    client: CompactTxStreamerClient,
}

impl LightwalletdClient {
    pub async fn connect(url: &str) -> Result<Self>;

    pub async fn get_latest_block(&self) -> Result<BlockId>;

    pub async fn get_block_range(
        &self,
        start: u64,
        end: u64
    ) -> Result<Vec<CompactBlock>>;

    pub async fn get_transaction(&self, txid: &[u8]) -> Result<RawTransaction>;

    pub async fn send_raw_transaction(&self, tx: &[u8]) -> Result<SendResponse>;
}
```

### 2. Memo Scanner (`src/memo/`)

**Purpose:** Scan blockchain for memos to admin address

```rust
pub struct MemoScanner {
    client: LightwalletdClient,
    viewing_key: UnifiedFullViewingKey,
    admin_address: PaymentAddress,
}

impl MemoScanner {
    pub async fn scan_range(
        &self,
        start_height: u64,
        end_height: u64,
    ) -> Result<Vec<DetectedMemo>>;

    pub async fn scan_latest(&self, num_blocks: u64) -> Result<Vec<DetectedMemo>>;
}

pub struct DetectedMemo {
    pub txid: String,
    pub height: u64,
    pub timestamp: Option<i64>,
    pub from_address: Option<String>,
    pub memo_content: String,
    pub amount: u64,
}
```

### 3. Memo Parser (`src/memo/`)

**Purpose:** Parse structured memo data

```rust
pub struct MemoParser;

impl MemoParser {
    /// Parse verification memo format: {z:15,b:"bio",n:"name"}
    pub fn parse_verification_memo(memo: &str) -> Result<VerificationRequest>;

    /// Parse OTP memo format: OTP:123456
    pub fn parse_otp_memo(memo: &str) -> Result<String>;
}

pub struct VerificationRequest {
    pub zcasher_id: u32,
    pub profile_updates: HashMap<String, String>,
    pub link_mutations: Vec<LinkMutation>,
}

pub enum LinkMutation {
    Add { url: String, verify: bool },
    Remove { id: u32 },
    MarkForVerification { id: u32 },
}
```

### 4. Transaction Builder (`src/transaction/`)

**Purpose:** Build shielded transactions with memos

```rust
pub struct TransactionBuilder {
    spending_key: ExtendedSpendingKey,
    lightwalletd: LightwalletdClient,
}

impl TransactionBuilder {
    pub async fn build_memo_transaction(
        &self,
        recipient: PaymentAddress,
        amount: u64,
        memo: String,
    ) -> Result<Transaction>;

    pub async fn send_otp(
        &self,
        recipient: PaymentAddress,
        otp_code: String,
    ) -> Result<TxId>;
}
```

### 5. OTP Service (`src/verification/`)

**Purpose:** OTP generation and validation

```rust
pub struct OtpService {
    secret_key: Vec<u8>,
}

impl OtpService {
    pub fn generate_otp(&self) -> Otp;

    pub fn hash_otp(&self, otp: &str) -> String;

    pub fn verify_otp(&self, supplied: &str, hash: &str) -> bool;
}

pub struct Otp {
    pub code: String,           // "AB12CD"
    pub hash: String,           // SHA-256 hash
    pub expires_at: DateTime<Utc>,
    pub attempts_left: u8,
}
```

### 6. Verification Manager (`src/verification/`)

**Purpose:** High-level verification orchestration

```rust
pub struct VerificationManager {
    scanner: MemoScanner,
    builder: TransactionBuilder,
    otp_service: OtpService,
    db: Option<Database>,  // Optional database for state
}

impl VerificationManager {
    pub async fn scan_and_process(&self) -> Result<Vec<VerificationRequest>>;

    pub async fn send_otp_for_request(&self, req: &VerificationRequest) -> Result<String>;

    pub async fn confirm_otp(&self, zcasher_id: u32, otp: &str) -> Result<bool>;
}
```

## Library API (Public Interface)

**What users import:**

```rust
use zcash_memo_verifier::{
    LightwalletdClient,
    MemoScanner,
    MemoParser,
    TransactionBuilder,
    VerificationManager,
    VerificationRequest,
};

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to lightwalletd
    let client = LightwalletdClient::connect("http://localhost:9067").await?;

    // Set up scanner
    let scanner = MemoScanner::new(
        client.clone(),
        viewing_key,
        admin_address,
    );

    // Scan for new memos
    let memos = scanner.scan_latest(100).await?;

    for memo in memos {
        if let Ok(verification) = MemoParser::parse_verification_memo(&memo.memo_content) {
            println!("New verification request: {:?}", verification);

            // Send OTP response
            let builder = TransactionBuilder::new(spending_key, client.clone());
            builder.send_otp(memo.from_address, "AB12CD").await?;
        }
    }

    Ok(())
}
```

## Example HTTP Server (`examples/server.rs`)

**Reference implementation for web apps:**

```rust
use axum::{Router, routing::post};
use zcash_memo_verifier::VerificationManager;

#[tokio::main]
async fn main() {
    let manager = VerificationManager::new(config).await;

    let app = Router::new()
        .route("/verify/scan", post(scan_handler))
        .route("/verify/send-otp", post(send_otp_handler))
        .route("/verify/confirm-otp", post(confirm_otp_handler));

    axum::Server::bind(&"0.0.0.0:8000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn scan_handler() -> Json<ScanResponse> {
    // Scan for new verification memos
}

async fn send_otp_handler(Json(payload): Json<SendOtpRequest>) -> Json<OtpResponse> {
    // Generate and send OTP
}

async fn confirm_otp_handler(Json(payload): Json<ConfirmOtpRequest>) -> Json<ConfirmResponse> {
    // Validate OTP and promote edits
}
```

## Configuration

**Environment variables or config file:**

```toml
# config.toml
[lightwalletd]
url = "http://localhost:9067"

[keys]
# Admin wallet full viewing key (for scanning)
viewing_key = "zxviews1..."

# Admin wallet spending key (for sending OTPs)
spending_key = "secret-extended-key-main1..."

[verification]
otp_amount_zec = 0.0005
otp_expiry_hours = 24
otp_max_attempts = 3

[database]
# Optional: for persistent state
url = "postgres://user:pass@localhost/zcash_verifier"

[http]
# For example server
host = "0.0.0.0"
port = 8000
```

## Distribution Options

### 1. As Rust Library (crates.io)

```bash
# Add to Cargo.toml
[dependencies]
zcash-memo-verifier = "0.1.0"
```

Users write their own binaries using the library.

### 2. As Binary (build from source)

```bash
git clone https://github.com/you/zcash-memo-verifier
cd zcash-memo-verifier
cargo build --release --example server
./target/release/examples/server
```

### 3. Via Cargo Install

```bash
cargo install zcash-memo-verifier --example server
zcash-memo-verifier-server --config config.toml
```

### 4. Docker

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release --example server

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/examples/server /usr/local/bin/
EXPOSE 8000
CMD ["server", "--config", "/etc/zcash-verifier/config.toml"]
```

```bash
docker run -p 8000:8000 \
  -v $(pwd)/config.toml:/etc/zcash-verifier/config.toml \
  your/zcash-memo-verifier
```

### 5. GitHub Releases (pre-built binaries)

```
zcash-memo-verifier-v1.0.0-linux-amd64
zcash-memo-verifier-v1.0.0-linux-amd64.sha256
zcash-memo-verifier-v1.0.0-darwin-arm64
zcash-memo-verifier-v1.0.0-darwin-arm64.sha256
```

Users download and verify checksums.

## Dependencies (Cargo.toml)

```toml
[dependencies]
# Zcash core
zcash_primitives = "0.15"
zcash_client_backend = "0.12"
zcash_proofs = "0.15"
orchard = "0.8"

# gRPC client for lightwalletd
tonic = "0.11"
prost = "0.12"

# Async runtime
tokio = { version = "1.35", features = ["full"] }

# HTTP server (for example)
axum = "0.7"

# Crypto
sha2 = "0.10"
rand = "0.8"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database (optional)
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio"], optional = true }

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Config
config = "0.14"
```

## Security Considerations

### Key Management

1. **Viewing Key** - Can only read transactions, cannot spend
2. **Spending Key** - Required for sending OTPs, must be protected
3. **Never logged** - Keys never written to logs
4. **Config file permissions** - Must be 0600 (owner read/write only)

### Attack Surface

**What this service CAN'T compromise:**
- ❌ zebrad (separate process)
- ❌ lightwalletd (separate process, official binary)
- ❌ Other wallets (isolated keys)

**What this service CAN access:**
- ✅ Admin wallet viewing key (explicitly configured)
- ✅ Admin wallet spending key (explicitly configured)
- ✅ Public blockchain data

**Mitigation:**
- Use a dedicated admin wallet for verification only
- Keep minimal funds (only for OTP transaction fees)
- Monitor wallet balance
- Rate limit OTP sends

### Database Security

If using database for state:
- Connection string in config file (not environment)
- Use prepared statements (SQLx default)
- Hash OTP codes (SHA-256)
- Expire old verification requests

## Use Cases Beyond Your Directory

This library enables:

1. **Identity verification systems** - Prove ownership of Zcash address
2. **Signed message protocols** - Send authenticated messages via memos
3. **Proof of payment** - Verify specific memos were included in payments
4. **Multi-sig coordination** - Coordinate via encrypted memos
5. **Decentralized auth** - Zcash address as identity
6. **Community platforms** - Link Zcash addresses to profiles
7. **Reputation systems** - Build reputation on verified addresses

## Migration from Current Python Service

### Current (Python + zcashd):
```
FastAPI → zcashd RPC (localhost:8232) → wallet
```

### New (Rust + zebrad + lightwalletd):
```
Rust service → lightwalletd gRPC (localhost:9067) → zebrad
```

### Migration steps:

1. ✅ Keep zebrad running
2. ✅ Add lightwalletd (connects to zebrad)
3. ✅ Build Rust service
4. ✅ Configure viewing/spending keys
5. ✅ Test parallel to Python service
6. ✅ Switch Next.js frontend to new endpoints
7. ✅ Deprecate Python service

### Compatibility:

- Same HTTP API contract
- Same memo format
- Same database schema (can share Supabase)
- Drop-in replacement

## Next Steps

1. **Prototype core scanner** - Get memo scanning working
2. **Test transaction building** - Send test memo transactions
3. **HTTP API wrapper** - Build example server
4. **Documentation** - Usage examples and guides
5. **Publish to crates.io** - Make library available
6. **Release binaries** - Pre-built for common platforms

## Questions to Resolve

1. **Database integration** - Required or optional?
2. **State management** - In-memory vs persistent?
3. **Concurrent scanning** - Handle multiple requests?
4. **Rate limiting** - Protect against abuse?
5. **Monitoring** - Metrics and logging?
6. **Multi-wallet** - Support multiple admin addresses?

---

**Summary:**

A trustworthy, open-source Rust library that:
- Connects to official lightwalletd (no fork needed)
- Scans for verification memos
- Sends OTP responses
- Provides reusable components for Zcash memo-based applications
- Distributable as library or binary
- Auditable and buildable from source
