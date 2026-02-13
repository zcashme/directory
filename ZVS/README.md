# ZVS - Zcash Verification Service

A two-factor authentication (2FA) service using shielded Zcash transactions. Users send verification requests via encrypted transaction memos, and ZVS responds with HMAC-derived one-time passwords (OTPs).

## How It Works

1. **User sends verification request** - A shielded Zcash transaction with a memo containing the verification payload
2. **ZVS monitors the blockchain** - Connects to a lightwalletd server and scans for incoming transactions
3. **OTP generation** - For valid verification requests, ZVS generates an HMAC-SHA256 based 6-digit OTP
4. **Response transaction** - ZVS sends the OTP back to the user via a shielded transaction memo

## Requirements

- Rust toolchain (edition 2021)
- Access to a lightwalletd server
- Zcash Sapling parameters (for transaction proving)

### Fetching Sapling Parameters

Before running ZVS, you need the Sapling proving parameters:

```bash
./fetch-params.sh
```

Or manually download them to `~/.zcash-params/`.

## Configuration

ZVS is configured via environment variables. Create a `.env` file:

```env
# Required
LIGHTWALLETD_URL=https://mainnet.lightwalletd.com:9067
SEED_HEX=<your-wallet-seed-in-hex>
OTP_SECRET=<your-otp-secret-in-hex>

# Optional
BIRTHDAY_HEIGHT=1        # Wallet birthday height (default: 1)
ZVS_DATA_DIR=./zvs_data  # Data directory (default: ./zvs_data)
POLL_INTERVAL=30         # Block polling interval in seconds (default: 30)
RUST_LOG=info            # Log level (default: info)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIGHTWALLETD_URL` | Yes | gRPC URL of the lightwalletd server |
| `SEED_HEX` | Yes | Wallet seed phrase encoded as hex |
| `OTP_SECRET` | Yes | Secret key for HMAC-based OTP generation (hex-encoded) |
| `BIRTHDAY_HEIGHT` | No | Block height when the wallet was created (default: 1) |
| `ZVS_DATA_DIR` | No | Directory for wallet database (default: `./zvs_data`) |
| `POLL_INTERVAL` | No | Seconds between blockchain polls (default: 30) |

## Building

```bash
cargo build --release
```

## Running

```bash
cargo run --release
```

On startup, ZVS will display:
- The wallet's unified address
- Current balance
- Pending verification requests with their OTPs
- Then enter the monitoring loop

## Architecture

```
src/
├── main.rs       # CLI runner and startup logic
├── lib.rs        # Core ZVS service implementation
└── memo_rules.rs # Memo validation rules
```

### Core Components

- **`ZVS`** - Main service struct handling wallet operations and blockchain monitoring
- **`MemoryBlockSource`** - In-memory cache for compact blocks during sync
- **`ReceivedMemo`** - Parsed memo data from received transactions
- **`VerificationData`** - Extracted session ID and reply address from verification requests

### Response Format

OTP response memos follow this format:
```
ZVS:otp:XXXXXX:req:TXID_PREFIX
```

- `XXXXXX` - 6-digit OTP
- `TXID_PREFIX` - First 16 characters of the request transaction ID (for correlation)

## Protocol

### Verification Request

Send a shielded transaction to the ZVS wallet address with a memo containing:
- Currently: `pineapple` (test mode)

### Verification Response

ZVS responds with a shielded transaction containing:
- Memo: `ZVS:otp:123456:req:abc123...` format
- Amount: 10,000 zatoshis (0.0001 ZEC)

## Security Considerations

- **Shielded transactions** - All communication uses Zcash shielded pools (Sapling/Orchard)
- **HMAC-SHA256** - OTPs are derived deterministically from session IDs
- **No external state** - Request tracking uses the blockchain itself via memo correlation

## Dependencies

Key dependencies:
- `zcash_client_backend` / `zcash_client_sqlite` - Zcash wallet functionality
- `zcash_proofs` - Zero-knowledge proof generation
- `tonic` - gRPC client for lightwalletd
- `hmac` / `sha2` - OTP generation
- `tokio` - Async runtime

## License

MIT
