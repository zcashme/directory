# ZVS Architecture

## Overview

ZVS (Zcash Verification Service) is a **real-time transaction processor**, not a traditional wallet. It runs persistently on a VPS, monitors incoming shielded transactions, decrypts memos, and responds with OTP transactions when valid verification requests are detected.

---

## Current Architecture

```
┌─────────────┐    sync()     ┌──────────────────┐
│ lightwalletd │◄────────────►│ zcash_client_sql │
└─────────────┘               └────────┬─────────┘
                                       │ query DB
                                       ▼
                              ┌──────────────────┐
                              │   ZVS (lib.rs)   │
                              │                  │
                              │ processed_txids  │ ◄── In-memory HashSet
                              │   (HashSet)      │     Lost on restart!
                              └──────────────────┘
```

### Current Problems

1. `processed_txids` is in-memory - **lost on restart**
2. Pending OTPs in Supabase are fine, but ZVS doesn't know what it already processed
3. Could re-process same txid after restart → **duplicate OTP sends**

---

## Recommended Architecture: Hybrid Streaming + Persistent State

```
┌─────────────────────────────────────────────────────────────────┐
│                         lightwalletd                            │
│                                                                 │
│  GetBlockRange (stream)  │  GetTransaction (full tx for memo)  │
└───────────┬──────────────┴──────────────────────────────────────┘
            │ stream blocks
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                            ZVS                                  │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Block Processor │───►│ Memo Decryptor  │                    │
│  │ (streaming)     │    │ (trial decrypt) │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                                  ▼                              │
│                    ┌─────────────────────────┐                  │
│                    │    State Manager        │                  │
│                    │                         │                  │
│                    │  • last_scanned_height  │                  │
│                    │  • processed_txids      │◄─── SQLite/file  │
│                    │  • pending_otps         │                  │
│                    └─────────────────────────┘                  │
│                                  │                              │
│                                  ▼                              │
│                    ┌─────────────────────────┐                  │
│                    │   Action Executor       │                  │
│                    │  (send OTP tx, etc)     │                  │
│                    └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Comparison

| Approach | Latency | Complexity | Restart Safety | Duplicate Handling |
|----------|---------|------------|----------------|-------------------|
| **Current (DB polling)** | ~seconds | Low | Needs work | txid set in memory |
| **gRPC streaming** | ~instant | Medium | Needs checkpointing | Block-based idempotency |
| **Hybrid (stream + persist)** | ~instant | Medium | Full recovery | txid in persistent store |

---

## Key Components for Restart Safety

### 1. Persistent Checkpoint

```rust
// zvs_state.db or JSON file
struct ZvsCheckpoint {
    last_scanned_height: u32,
    last_scanned_hash: [u8; 32],  // detect reorgs
}
```

### 2. Processed Transactions Table

```sql
-- In zvs_state.db (separate from wallet.db)
CREATE TABLE zvs_processed_txs (
    txid BLOB PRIMARY KEY,       -- 32 bytes
    block_height INTEGER,
    processed_at TEXT,           -- ISO timestamp
    action_taken TEXT            -- 'otp_sent', 'ignored', 'invalid_memo'
);

CREATE INDEX idx_processed_height ON zvs_processed_txs(block_height);
```

### 3. Pending OTPs

Already handled by Supabase `verification_codes` table. On restart, query for unsent OTPs:

```sql
SELECT * FROM verification_codes
WHERE otp_send_success IS NULL
  AND expires_at > NOW();
```

---

## Startup Recovery Flow

```rust
async fn startup_recovery(&mut self) -> Result<()> {
    // 1. Load last checkpoint
    let checkpoint = self.load_checkpoint()?;

    // 2. Get current chain height
    let chain_height = self.lightwalletd.get_latest_block_height().await?;

    // 3. Rewind a few blocks for safety (reorg protection)
    let safe_start = checkpoint.last_scanned_height.saturating_sub(10);

    // 4. Load processed txids from that range
    self.processed_txids = self.db.get_processed_txids_since(safe_start)?;

    // 5. Check for any pending OTPs that need retry
    let pending = self.supabase.get_unsent_otps().await?;
    for otp in pending {
        if !otp.expired() {
            self.retry_otp_send(otp).await?;
        }
    }

    // 6. Resume streaming from safe_start
    self.stream_from_height(safe_start).await
}
```

---

## Real-Time Processing Loop

```rust
async fn run_realtime(&mut self) -> Result<()> {
    loop {
        // 1. Sync wallet to get new notes
        let sync_result = self.sync().await?;

        // 2. For each new memo, check if processed
        for memo in sync_result.new_memos {
            if self.is_processed(&memo.txid)? {
                continue;  // Skip duplicate
            }

            // 3. Process and mark
            let action = self.process_memo(&memo).await?;
            self.mark_processed(&memo.txid, &action)?;

            // 4. Save checkpoint
            self.save_checkpoint(sync_result.latest_height)?;
        }

        // 5. Brief sleep before next poll
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}
```

---

## Duplicate Prevention Strategies

| Strategy | Pros | Cons |
|----------|------|------|
| **Txid in SQLite** | Survives restart, queryable | Extra DB writes |
| **Txid in Redis** | Fast, TTL support | Another dependency |
| **Idempotency key in Supabase** | Already using it | Network latency |
| **Block height watermark** | Simple | Doesn't handle reorgs |

**Recommended for ZVS**: SQLite table + block height watermark

---

## Memo Decryption Flow

### How Zashi/Zingo Do It (for reference)

1. **During sync**: Compact blocks are scanned with trial decryption
2. **Compact blocks lack memos**: Only 52-byte note plaintext
3. **Full tx fetch**: Call `GetTransaction` RPC to get full ciphertext
4. **Decrypt**: ChaCha20Poly1305 with ECDH-derived key
5. **Store**: Memo saved to SQLite `sapling_received_notes.memo`

### ZVS Approach

```rust
// src/lib.rs:545-600
async fn fetch_new_memos(&mut self) -> Result<Vec<ReceivedMemo>> {
    // 1. Query wallet DB for received notes (no memo stored)
    let rows = conn.prepare(
        "SELECT t.txid, t.block, srn.value
         FROM sapling_received_notes srn
         JOIN transactions t ON srn.transaction_id = t.id_tx"
    )?;

    // 2. For each note, fetch full tx from lightwalletd & decrypt
    for (txid, block_height, value) in rows {
        let memo_text = self.fetch_transaction_memo(&txid, height).await?;
    }
}
```

**Difference**: ZVS decrypts on-demand rather than storing memos in wallet DB.

---

## Cryptographic Details

### Note Plaintext Structure (564 bytes)

| Bytes | Field | Description |
|-------|-------|-------------|
| 0 | `leadByte` | Version (0x01 legacy, 0x02 ZIP-212) |
| 1-11 | `diversifier` | 11-byte diversifier |
| 12-19 | `value` | 8-byte LE zatoshi amount |
| 20-51 | `rseed` | 32-byte random seed |
| **52-563** | **memo** | **512-byte encrypted memo** |

### Decryption Steps

1. **ECDH**: `shared_secret = ka_agree_dec(ivk, epk)`
2. **KDF**: `key = Blake2b("Zcash_SaplingKDF", shared_secret || epk)`
3. **Decrypt**: `plaintext = ChaCha20Poly1305(key, nonce=0, ciphertext)`
4. **Extract**: `memo = plaintext[52..564]`

---

## Implementation Priorities

### Phase 1: Restart Safety (Quick Wins)

- [ ] Replace in-memory `HashSet` with SQLite table
- [ ] Add checkpoint file with last scanned height
- [ ] Startup recovery that reloads state
- [ ] Retry pending OTPs on startup

### Phase 2: Robustness

- [ ] Reorg detection via block hash comparison
- [ ] Exponential backoff for failed OTP sends
- [ ] Health check endpoint for monitoring
- [ ] Graceful shutdown with state persistence

### Phase 3: Performance (If Needed)

- [ ] gRPC streaming instead of polling
- [ ] Batch memo decryption
- [ ] Connection pooling to lightwalletd

---

## File Structure

```
ZVS/
├── src/
│   └── lib.rs              # Core ZVS logic
├── zvs_data/
│   ├── wallet.db           # zcash_client_sqlite wallet
│   └── zvs_state.db        # ZVS-specific state (NEW)
├── Cargo.toml
├── ARCHITECTURE.md         # This file
└── HANDOFF.md              # librustzcash learnings
```

---

## References

- [librustzcash](https://github.com/zcash/librustzcash) - Core Rust implementation
- [zcash_note_encryption](https://github.com/zcash/zcash_note_encryption) - Note encryption
- [sapling-crypto](https://github.com/zcash/sapling-crypto) - Sapling cryptography
- [ZIP-212](https://zips.z.cash/zip-0212) - Recipient derivation of ephemeral secret
- [Zcash Protocol Spec](https://zips.z.cash/protocol/protocol.pdf) - Section 5.5
