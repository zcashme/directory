# ZVS Handoff Document

## Project Overview

ZVS (Zcash Verification Service) is a service that:
1. Scans the Zcash blockchain for incoming shielded transactions
2. Reads memos from received notes
3. Sends transactions with memos (e.g., OTPs) to users

## Architecture

```
┌─────────────┐     gRPC      ┌──────────────────┐
│ lightwalletd │◄────────────►│       ZVS        │
└─────────────┘               │                  │
                              │  ┌────────────┐  │
                              │  │MemoryBlock │  │
                              │  │  Source    │  │
                              │  └────────────┘  │
                              │  ┌────────────┐  │
                              │  │  WalletDb  │  │
                              │  │  (SQLite)  │  │
                              │  └────────────┘  │
                              └──────────────────┘
```

## Key Libraries from librustzcash

### `zcash_client_backend` (v0.21)
The main library for wallet functionality. Provides:
- `CompactTxStreamerClient` - gRPC client for lightwalletd
- `BlockSource` trait - abstraction for reading cached blocks
- `scan_cached_blocks` - scans blocks and updates wallet state
- `propose_transfer` / `create_proposed_transactions` - transaction building
- Proto definitions for compact blocks

### `zcash_client_sqlite` (v0.19)
SQLite-based wallet implementation:
- `WalletDb` - persistent wallet state (notes, witnesses, tree data)
- `BlockDb` - reads cached blocks from SQLite (read-only!)
- `FsBlockDb` - writes blocks to disk (requires `unstable` feature)

**Important**: `BlockDb` only READS blocks. To WRITE blocks, you either:
1. Enable `unstable` feature for `FsBlockDb`
2. Insert directly via SQL
3. Implement your own `BlockSource` (what we did)

### `zcash_proofs` (v0.26)
Proving system for Sapling transactions:
- `LocalTxProver` - loads proving parameters from disk (~50MB)
- Required for creating shielded spends

### `zcash_protocol` (v0.7)
Core protocol types:
- `BlockHeight`, `MainNetwork`, `TestNetwork`
- `Zatoshis` - amount type
- `MemoBytes` - 512-byte memo

## Scanning Flow

### Two Approaches

**1. Simple Streaming (no persistence)**
```rust
// Stream blocks, decrypt on the fly
stream = client.get_block_range(range);
while let Some(block) = stream.next() {
    for output in block.outputs {
        if let Some(note) = try_compact_note_decryption(&ivk, &output) {
            // Found a note for us (but no memo - compact only)
        }
    }
}
```
- Pros: Simple, no storage
- Cons: Can't get full memos, can't spend (no witnesses)

**2. WalletDb + BlockSource (persistent)**
```rust
// Download blocks into BlockSource
let mut block_source = MemoryBlockSource::new();
for block in stream {
    block_source.insert(block);
}

// Scan into WalletDb
scan_cached_blocks(&network, &block_source, &mut wallet, from, limit)?;
```
- Pros: Full memo access, can spend notes, proper witness tracking
- Cons: More complex, needs storage

## Memo Extraction

Compact blocks only contain 52 bytes of ciphertext - enough to detect notes but NOT enough for memos.

To get memos:
1. Detect note in compact block (fast scan)
2. Fetch full transaction via `get_transaction`
3. Use `try_note_decryption` (not compact version) with full ciphertext

```rust
// Compact decryption - detects note, no memo
try_compact_note_decryption(&domain, &ivk, &compact_output)

// Full decryption - returns (note, recipient, memo)
try_note_decryption(&domain, &ivk, &full_output)
```

## Sending Transactions

Requires:
1. **Spendable notes** - tracked by WalletDb after scanning
2. **Witnesses** - merkle paths, maintained by WalletDb's shardtree
3. **Proving parameters** - Sapling params (~50MB), loaded by `LocalTxProver`

```rust
// 1. Propose transfer
let proposal = propose_transfer(
    &mut wallet,
    &network,
    account_id,
    &change_strategy,  // ZIP-317 fees
    &payments,
)?;

// 2. Create & sign transaction
let txids = create_proposed_transactions(
    &mut wallet,
    &network,
    &prover,
    &usk,
    OvkPolicy::Sender,
    &proposal,
)?;

// 3. Broadcast
client.send_transaction(raw_tx).await?;
```

## Common Pitfalls

### Version Conflicts
Multiple versions of `zcash_protocol` can be pulled in. Symptoms:
- "expected MemoBytes, found MemoBytes"
- "expected Zatoshis, found Zatoshis"

Solution: Let `zcash_client_backend` pull in dependencies, avoid specifying versions for transitive deps.

### BlockSource Write Access
`BlockDb::insert()` doesn't exist. Options:
1. Use `FsBlockDb` (unstable feature)
2. Implement custom `BlockSource` with in-memory storage
3. Raw SQL inserts

### Async + WalletDb
`WalletDb` is not Send/Sync. If using with tokio:
- Use `tokio::task::spawn_blocking` for DB operations
- Or wrap in `Arc<RwLock<WalletDb>>` carefully

### Sapling vs Orchard
- Sapling: Older shielded pool, requires external proving params
- Orchard: Newer (NU5), uses Halo2 (no trusted setup)
- Both can be scanned simultaneously via `UnifiedSpendingKey`

## Current State

- [x] Connect to lightwalletd
- [x] Stream compact blocks
- [x] In-memory BlockSource implementation
- [ ] WalletDb initialization with seed
- [ ] Scanning blocks into WalletDb
- [ ] Balance queries
- [ ] Send with memo

## Files

```
src/
├── lib.rs      # ZVS struct, MemoryBlockSource, sync logic
└── main.rs     # CLI entry point
```

## Environment Variables

```
LIGHTWALLETD_URL=https://zec.rocks:443
SEED_HEX=<64-char hex seed>
BIRTHDAY_HEIGHT=<block height when wallet created>
ZVS_DATA_DIR=./zvs_data
```

## Resources

- [librustzcash](https://github.com/zcash/librustzcash) - Core Zcash Rust libraries
- [lightwalletd](https://github.com/zcash/lightwalletd) - Light client server
- [ZIP-317](https://zips.z.cash/zip-0317) - Fee mechanism
- [ZIP-321](https://zips.z.cash/zip-0321) - Payment request format
