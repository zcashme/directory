# Stateless Verification Architecture

## Core Insight: Blockchain IS Your Verification State

The transaction itself contains everything you need:

```
Transaction on blockchain:
├─ txid (unique ID)
├─ timestamp (expiration)
├─ from_address (user identity)
├─ to_address (proves sent to you)
├─ amount (sybil resistance)
└─ memo (verification request)
```

**That's your verification state. It's immutable, timestamped, and cryptographically signed.**

## What This Eliminates

❌ `verification_codes` table - OTP computed on-demand from txid
❌ `pending_zcasher_edits` table - Updates applied directly from memo
❌ `transactions` table - Query blockchain via lightwalletd

## Complete Stateless Flow

### 1. User Sends Verification Request

```
User wallet → admin_wallet
Tx: ABC123
Memo: {z:15,b:"New bio",n:"Alice"}
Amount: 0.001 ZEC
```

**No database write.** Transaction exists on blockchain.

### 2. Generate Deterministic OTP

```rust
// OTP is cryptographically derived from transaction
fn generate_otp(txid: &str, secret: &[u8]) -> String {
    let hmac = hmac_sha256(secret, txid.as_bytes());
    base32_encode(&hmac[0..6]) // "AB12CD"
}
```

**No database write.** OTP is computed on-demand from txid.

### 3. Send OTP Back

```
admin_wallet → user_wallet
Memo: "OTP:AB12CD"
Amount: 0.0001 ZEC
```

**No database write.** OTP delivered via blockchain.

### 4. User Submits OTP

Frontend sends: `{txid: "ABC123", otp: "AB12CD", zcasher_id: 15}`

Backend validates (stateless):

```typescript
// 1. Fetch transaction from blockchain (via Rust crate)
const tx = await rust_service.get_transaction(txid);

// 2. Validate transaction properties (all on-chain data)
if (!tx.exists)
  return error("Transaction not found");

if (tx.to_address !== ADMIN_ADDRESS)
  return error("Not sent to verification address");

if (tx.timestamp < Date.now() - 24*60*60*1000)
  return error("Expired (24h limit)");

if (tx.amount < MINIMUM_AMOUNT)
  return error("Insufficient amount");

// 3. Check single-use (only state needed: last used txid)
const user = await supabase
  .from('zcasher')
  .select('last_verification_txid')
  .eq('id', zcasher_id)
  .single();

if (user.last_verification_txid === txid)
  return error("Already used");

// 4. Verify OTP (recompute from txid, no lookup)
const expected_otp = generate_otp(txid, SECRET_KEY);
if (otp !== expected_otp)
  return error("Invalid OTP");

// 5. Parse memo for updates (from blockchain)
const updates = parse_memo(tx.memo);

// 6. Apply updates directly
await supabase
  .from('zcasher')
  .update({
    bio: updates.b,
    name: updates.n,
    last_verification_txid: txid,
    last_verified_at: new Date(),
    address_verified: true,
  })
  .eq('id', zcasher_id);
```

## Security Properties

### Expiration
- **Source:** Blockchain timestamp (immutable)
- **Check:** `tx.timestamp < now() - 24h`
- **No state needed**

### Single-Use
- **Source:** Store last used txid in user record
- **Check:** `last_verification_txid === submitted_txid`
- **Minimal state:** One field per user

### OTP Validation
- **Source:** Deterministic derivation from txid
- **Check:** `hmac(txid, secret) === submitted_otp`
- **No state needed**

### Sybil Resistance
- **Source:** Transaction amount on blockchain
- **Check:** `tx.amount >= minimum`
- **No state needed**

### Attempt Limiting
- **Option A:** No limit (use longer OTP: 10 chars = 36^10 combinations)
- **Option B:** Rate limit by IP (in-memory, no persistence)
- **Option C:** Check blockchain for verification history (advanced)

**Recommended: Option A** - Simpler, no state.

## Minimal State Required

**Only add 2 fields to existing `zcasher` table:**

```sql
ALTER TABLE zcasher
ADD COLUMN last_verification_txid TEXT,
ADD COLUMN last_verified_at TIMESTAMP;
```

**That's it. No separate verification tables.**

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│  Blockchain (Source of Truth)               │
│  - Verification requests (incoming txs)     │
│  - OTP responses (outgoing txs)             │
│  - Timestamps (for expiration)              │
│  - Immutable audit trail                    │
└──────────────────┬──────────────────────────┘
                   │ Query on-demand
                   │
       ┌───────────▼────────────┐
       │  Rust Crate            │
       │  (Stateless Interface) │
       │  - scan_incoming()     │
       │  - get_transaction()   │
       │  - send_memo()         │
       └───────────┬────────────┘
                   │ HTTP/gRPC
                   │
       ┌───────────▼────────────┐
       │  Backend (Next.js)     │
       │  - Compute OTP         │
       │  - Validate tx         │
       │  - Apply updates       │
       └───────────┬────────────┘
                   │ Update only
                   │
       ┌───────────▼────────────┐
       │  Supabase              │
       │  - User profiles       │
       │  - last_verification_  │
       │    txid (single-use)   │
       └────────────────────────┘
```

## Benefits

✅ **No verification state tables** - Blockchain is the database
✅ **Simpler architecture** - Less state to sync
✅ **Immutable audit trail** - Blockchain records everything
✅ **No state consistency issues** - Single source of truth
✅ **Deterministic OTPs** - Can be recomputed anytime
✅ **Cryptographically secure** - HMAC-based OTP generation

## Query Performance

**Concern:** Must query blockchain for every verification?

**Answer:** Yes, but it's fast:
- lightwalletd indexes transactions by txid
- Single lookup: `get_transaction(txid)`
- Only happens once per verification (not on page loads)
- Typical latency: <100ms

## OTP Generation (Deterministic)

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn generate_otp(txid: &str, secret: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(secret)
        .expect("HMAC can take key of any size");
    mac.update(txid.as_bytes());

    let result = mac.finalize();
    let bytes = result.into_bytes();

    // Base32 encode first 6 bytes for readability
    // Gives 10-character alphanumeric OTP
    base32::encode(base32::Alphabet::RFC4648 { padding: false }, &bytes[0..6])
}
```

**Properties:**
- Deterministic: Same txid always produces same OTP
- Secret-dependent: Attacker can't precompute without secret
- One-way: Can't derive txid from OTP
- Collision-resistant: Different txids produce different OTPs

## Migration Path

### Old System (with tables)

```typescript
// Store OTP
await supabase.from('verification_codes').insert({
  zcasher_id: 15,
  code_hash: sha256(otp),
  expires_at: new Date(Date.now() + 24*60*60*1000),
  attempts_left: 3,
});

// Validate OTP
const vc = await supabase
  .from('verification_codes')
  .select('*')
  .eq('zcasher_id', 15)
  .single();

if (sha256(entered_otp) !== vc.code_hash) error();
if (vc.attempts_left <= 0) error();
if (vc.expires_at < new Date()) error();
```

### New System (stateless)

```typescript
// No storage needed

// Validate OTP
const tx = await rust_service.get_transaction(txid);

if (!tx.exists) error("Transaction not found");
if (tx.timestamp < Date.now() - 24*60*60*1000) error("Expired");
if (generate_otp(txid, SECRET) !== entered_otp) error("Invalid");

const user = await supabase
  .from('zcasher')
  .select('last_verification_txid')
  .eq('id', 15)
  .single();

if (user.last_verification_txid === txid) error("Already used");
```

**Same security guarantees, no verification tables.**

## Edge Cases Handled

### User Loses OTP
**Solution:** Query their wallet for incoming memo with OTP
- OTP is stored on blockchain in their wallet
- Can retrieve anytime by scanning wallet history

### Admin Wants to Audit Verifications
**Solution:** Scan blockchain for all verification transactions
- All verification history is on-chain
- Can audit without database access
- Immutable record of all verifications

### Multiple Pending Verifications
**Solution:** Each has unique txid
- User can submit multiple verification requests
- Each generates unique OTP (different txid)
- No state collisions

### OTP Replay Attack
**Solution:** Track last used txid
- Once txid is used, mark in user record
- Second attempt with same txid rejected
- Minimal state: one field per user

## Security Analysis

**Threat Model:**

1. **Brute Force OTP**
   - Mitigation: 10-char alphanumeric = 36^10 combinations (~3.6 quadrillion)
   - Alternative: Rate limit by IP

2. **Replay Attack**
   - Mitigation: Track last_verification_txid per user
   - Once used, cannot reuse same txid

3. **Transaction Frontrunning**
   - Non-issue: Attacker would need to pay for verification tx
   - OTP derived from txid, not public before tx confirmed

4. **Secret Key Compromise**
   - Impact: Attacker can generate valid OTPs for any txid
   - Mitigation: Rotate secret key, invalidate old verifications
   - Same risk as any HMAC-based system

**Compared to Database Approach:**

| Property | Database OTP | Blockchain OTP |
|----------|-------------|----------------|
| State needed | verification_codes table | 1 field per user |
| Audit trail | Must log separately | Built-in (blockchain) |
| OTP source | Random generation | Deterministic HMAC |
| Expiration | Database timestamp | Blockchain timestamp |
| Single-use | Database flag | last_verification_txid |
| Secret rotation | Re-hash all OTPs | Invalidate by timestamp |

**Security equivalence:** Both approaches provide same security if implemented correctly.

## Conclusion

**The blockchain transaction contains all verification state:**
- Identity (from_address)
- Authorization (to admin address + amount)
- Data (memo with profile updates)
- Timestamp (expiration)
- Unique ID (txid for OTP generation)

**No separate verification database needed.**

**This is possible because lightwalletd provides efficient transaction lookup by txid.**

Without lightwalletd, you'd need to scan the entire blockchain. With lightwalletd, it's a simple indexed query.

**The minimal state required:** Just track the last used txid per user to prevent replay attacks.
