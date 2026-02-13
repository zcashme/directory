# ZVS Handoff Document

## Project Overview

ZVS (Zcash Verification Service) is a 2FA service using shielded Zcash transactions. Users send verification requests via memo, ZVS responds with HMAC-derived OTPs.

## Current State

### What Works

1. **Wallet Management** - Full wallet using `zcash_client_sqlite`
2. **Block Syncing** - Incremental sync with batched downloads (1000 blocks per batch)
3. **Memo Extraction** - Full transaction fetch and Sapling note decryption
4. **Real-time Monitoring** - `monitor` command polls for new blocks
5. **Verification Request Detection** - Parses `ZVS:verify:<session_id>:<address>` memos

### CLI Commands

```
zvs sync      # Sync wallet and show balance
zvs monitor   # Real-time block monitoring
zvs memos     # Show all received memos
zvs help      # Show help
```

### Environment Variables

```
LIGHTWALLETD_URL   # gRPC endpoint (default: https://zec.rocks:443)
SEED_HEX           # Wallet seed as hex (required)
BIRTHDAY_HEIGHT    # Block height when wallet was created
ZVS_DATA_DIR       # Data directory (default: ./zvs_data)
POLL_INTERVAL      # Monitor poll interval in seconds (default: 30)
```

## Architecture

```
User Wallet                    ZVS Service
    |                              |
    |-- shielded tx + memo ------->|
    |   "ZVS:verify:sess123:addr"  |
    |                              |-- detect verification request
    |                              |-- generate OTP = HMAC(secret, session_id)
    |<-- shielded tx + OTP memo ---|
    |                              |
```

## Key Technical Learnings

### Memo Extraction

Compact blocks only contain 52 bytes of ciphertext - NOT enough for 512-byte memos. Must fetch full transactions via `get_transaction(txid)` and decrypt with Sapling IVK.

```rust
// Decryption requires:
// 1. PreparedIncomingViewingKey (not ivk.prepare(), use PreparedIncomingViewingKey::new(&ivk))
// 2. SaplingDomain with Zip212Enforcement (not network/height params)
// 3. ZIP-212 activated at Canopy: mainnet height 1,046,400

let zip212 = if height >= 1_046_400 {
    Zip212Enforcement::On
} else {
    Zip212Enforcement::Off
};
let domain = SaplingDomain::new(zip212);
```

### Database Schema

`zcash_client_sqlite` uses `transaction_id` not `tx` for foreign keys:

```sql
SELECT t.txid, t.block, srn.value
FROM sapling_received_notes srn
JOIN transactions t ON srn.transaction_id = t.id_tx
```

### Dependencies

```toml
zcash_client_backend = { version = "0.21", features = ["lightwalletd-tonic", "orchard"] }
zcash_client_sqlite = { version = "0.19", features = ["orchard"] }
zcash_primitives = "0.26"
zcash_note_encryption = "0.4"
sapling-crypto = "0.5"  # NOT "sapling"
```

## TODO: HMAC OTP Implementation

### Design Decision

Stateless HMAC approach chosen: `OTP = HMAC(secret, session_id)`

- No database storage needed
- Deterministic - same session_id always produces same OTP
- Secret should be loaded from environment variable

### Implementation Steps

1. **Add HMAC dependency** to Cargo.toml:
   ```toml
   hmac = "0.12"
   sha2 = "0.10"
   ```

2. **Add OTP generation** in `lib.rs`:
   ```rust
   use hmac::{Hmac, Mac};
   use sha2::Sha256;

   type HmacSha256 = Hmac<Sha256>;

   fn generate_otp(secret: &[u8], session_id: &str) -> String {
       let mut mac = HmacSha256::new_from_slice(secret)
           .expect("HMAC can take key of any size");
       mac.update(session_id.as_bytes());
       let result = mac.finalize();
       // Take first 6 digits
       let code = u32::from_be_bytes(result.into_bytes()[..4].try_into().unwrap());
       format!("{:06}", code % 1_000_000)
   }
   ```

3. **Add send_otp()** method to ZVS:
   - Create transaction with OTP in memo
   - Send to `verification.user_address`
   - Requires spending key and transaction building
   - Use `zcash_client_backend::data_api::wallet::propose_transfer` + `create_proposed_transactions`

4. **Update handle_memo()** in `lib.rs:606`:
   ```rust
   fn handle_memo(&mut self, memo: &ReceivedMemo) {
       if let Some(ref verification) = memo.verification {
           let otp = generate_otp(&self.otp_secret, &verification.session_id);
           info!("Generated OTP {} for session {}", otp, verification.session_id);
           // self.send_otp(&verification.user_address, &otp).await;
       }
   }
   ```

5. **Add OTP_SECRET** environment variable:
   ```rust
   let otp_secret = env::var("OTP_SECRET")
       .map(|s| hex::decode(&s).expect("OTP_SECRET must be valid hex"))
       .expect("OTP_SECRET required");
   ```

### Transaction Sending

Sending requires:
- `zcash_proofs` with `local-prover` feature (already in Cargo.toml)
- Download Sapling params (~50MB) on first run
- Use `propose_transfer` API from `zcash_client_backend`

```rust
use zcash_client_backend::data_api::wallet::{
    input_selection::GreedyInputSelector,
    propose_transfer, create_proposed_transactions,
};
use zcash_primitives::transaction::components::amount::NonNegativeAmount;

async fn send_otp(&mut self, to_address: &str, otp: &str) -> Result<TxId> {
    let memo = format!("ZVS:otp:{}", otp);
    // ... build and send transaction
}
```

## Files

- `src/lib.rs` - Main ZVS service, wallet, sync, memo extraction
- `src/main.rs` - CLI entry point
- `src/memo_rules.rs` - Memo format validation

## Testing

The "pineapple" memo is a test case that triggers verification flow:
```
Memo: pineapple
  -> ZVS Request: session=pineapple, reply_to=u1tdkyje8l5...
```
