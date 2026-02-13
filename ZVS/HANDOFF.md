# ZVS Handoff Document

## Project Overview

ZVS (Zcash Verification Service) is a 2FA service that:
1. Hosts an admin wallet that monitors for incoming shielded transactions
2. Reads memos from received notes (e.g., verification requests)
3. Sends transactions with OTP memos back to users

## Architecture

```
┌─────────────────┐     gRPC      ┌──────────────────────────────────┐
│  lightwalletd   │◄─────────────►│              ZVS                 │
│  (zec.rocks)    │               │                                  │
└─────────────────┘               │  ┌────────────────────────────┐  │
                                  │  │     MemoryBlockSource      │  │
                                  │  │  (in-memory block cache)   │  │
                                  │  └────────────────────────────┘  │
                                  │               │                  │
                                  │               ▼                  │
                                  │  ┌────────────────────────────┐  │
                                  │  │   scan_cached_blocks()     │  │
                                  │  └────────────────────────────┘  │
                                  │               │                  │
                                  │               ▼                  │
                                  │  ┌────────────────────────────┐  │
                                  │  │      WalletDb (SQLite)     │  │
                                  │  │  - accounts, notes, trees  │  │
                                  │  └────────────────────────────┘  │
                                  └──────────────────────────────────┘
```

## Key Libraries

### Version Matrix (as of this implementation)

| Crate | Version | Purpose |
|-------|---------|---------|
| `zcash_client_backend` | 0.21 | Core wallet traits, scanning, tx building |
| `zcash_client_sqlite` | 0.19 | SQLite wallet implementation |
| `zcash_protocol` | 0.7 | Core types (BlockHeight, Zatoshis, Memo) |
| `zcash_proofs` | 0.26 | Proving system for Sapling transactions |
| `zcash_keys` | 0.12 | Key derivation (UnifiedSpendingKey) |
| `zip32` | 0.2 | HD wallet derivation (AccountId) |
| `secrecy` | 0.8 | Safe handling of seed bytes |

### `zcash_client_backend` (v0.21)

The main library for wallet functionality:

```rust
// Key imports
use zcash_client_backend::{
    data_api::{
        chain::{scan_cached_blocks, BlockSource, ChainState},
        wallet::{propose_transfer, create_proposed_transactions, ConfirmationsPolicy},
        AccountBirthday, WalletRead, WalletWrite,
    },
    proto::service::compact_tx_streamer_client::CompactTxStreamerClient,
    encoding::encode_payment_address,
};
```

**Key traits:**
- `WalletRead` - Query wallet state (balances, scan progress)
- `WalletWrite` - Modify wallet state (create accounts, store notes)
- `BlockSource` - Abstraction for reading cached blocks

### `zcash_client_sqlite` (v0.19)

SQLite-based wallet implementation:

```rust
use zcash_client_sqlite::{
    WalletDb,
    wallet::init::init_wallet_db,
    util::SystemClock,
    AccountUuid,
};

// WalletDb has 4 generic parameters:
// WalletDb<Connection, Network, Clock, Rng>
type MyWallet = WalletDb<rusqlite::Connection, MainNetwork, SystemClock, rand::rngs::OsRng>;
```

**Important:** `WalletDb::for_path()` takes 4 arguments:
```rust
let wallet = WalletDb::for_path(
    &db_path,      // Path to SQLite file
    MainNetwork,   // Network parameters
    SystemClock,   // Clock implementation (use zcash_client_sqlite::util::SystemClock)
    rand::rngs::OsRng,  // RNG for randomness
)?;
```

### `zcash_keys` (v0.12)

Key derivation:

```rust
use zcash_keys::keys::UnifiedSpendingKey;

// Derive USK from seed
let usk = UnifiedSpendingKey::from_seed(
    &MainNetwork,
    seed_bytes,
    zip32::AccountId::ZERO,  // First account
)?;

// Get viewing keys
let ufvk = usk.to_unified_full_viewing_key();
let sapling_dfvk = ufvk.sapling().unwrap();
let (_, address) = sapling_dfvk.default_address();
```

## Initialization Flow

### 1. Create WalletDb

```rust
let mut wallet = WalletDb::for_path(&db_path, MainNetwork, SystemClock, OsRng)?;
init_wallet_db(&mut wallet, None)?;  // Run migrations
```

### 2. Create Account from Seed

```rust
// Get birthday (tree state before wallet creation)
let tree_state = client.get_tree_state(BlockId { height: birthday_height - 1, .. }).await?;
let birthday = AccountBirthday::from_treestate(tree_state, None)?;

// Create account
let seed_secret: Secret<Vec<u8>> = Secret::new(seed.to_vec());
let (account_id, usk) = wallet.create_account("Name", &seed_secret, &birthday, None)?;
```

**Critical:** `AccountBirthday::from_treestate()` returns `BirthdayError` which doesn't implement `Display` or `Debug`. Handle with:
```rust
.map_err(|_| anyhow!("Failed to create birthday"))
```

### 3. Check for Existing Account

```rust
let accounts = wallet.get_account_ids()?;
if let Some(existing_id) = accounts.first() {
    // Re-derive USK from seed
    let usk = UnifiedSpendingKey::from_seed(&MainNetwork, seed, zip32::AccountId::ZERO)?;
}
```

## Scanning Flow

### BlockSource Trait

Implement `BlockSource` to provide blocks to the scanner:

```rust
impl BlockSource for MemoryBlockSource {
    type Error = anyhow::Error;

    fn with_blocks<F, DbErrT>(
        &self,
        from_height: Option<BlockHeight>,
        limit: Option<usize>,
        mut with_row: F,
    ) -> Result<(), chain::error::Error<DbErrT, Self::Error>>
    where
        F: FnMut(CompactBlock) -> Result<(), chain::error::Error<DbErrT, Self::Error>>,
    {
        // Iterate through blocks and call with_row for each
        for block in self.blocks.range(start..) {
            with_row(block.clone())?;
        }
        Ok(())
    }
}
```

### Scanning Blocks

```rust
// Get chain state at the block BEFORE scanning starts
let tree_state = client.get_tree_state(BlockId { height: from_height - 1, .. }).await?;
let birthday = AccountBirthday::from_treestate(tree_state, None)?;
let chain_state = birthday.prior_chain_state().clone();

// Scan
let result = scan_cached_blocks(
    &MainNetwork,
    &block_source,
    &mut wallet,
    BlockHeight::from_u32(from_height),
    &chain_state,
    limit,
)?;

println!("Received {} Sapling notes", result.received_sapling_note_count());
```

**Important:** `ChainState` is obtained via `AccountBirthday::from_treestate().prior_chain_state()`. Don't try to construct it manually with `ChainState::new()` - the API changed.

### Incremental Sync

```rust
// Check where we left off
let scan_from = wallet
    .block_fully_scanned()?
    .map(|meta| u32::from(meta.block_height()) + 1)
    .unwrap_or(birthday_height);

// Download and scan in batches
while current <= chain_tip {
    let batch_end = min(current + 1000 - 1, chain_tip);
    // Download blocks current..batch_end into MemoryBlockSource
    // Get chain_state for current - 1
    // scan_cached_blocks()
    current = batch_end + 1;
}
```

## Balance Queries

```rust
use zcash_client_backend::data_api::wallet::ConfirmationsPolicy;

let summary = wallet
    .get_wallet_summary(ConfirmationsPolicy::default())?
    .ok_or(anyhow!("Not synced"))?;

let balance = summary.account_balances().get(&account_id)?;

println!("Total: {}", balance.total());
println!("Sapling spendable: {}", balance.sapling_balance().spendable_value());
println!("Orchard spendable: {}", balance.orchard_balance().spendable_value());
```

**Note:** `get_wallet_summary()` takes `ConfirmationsPolicy`, not an integer. Use `ConfirmationsPolicy::default()` for ZIP-315 defaults (3 confirmations for own outputs, 10 for external).

## Sending Transactions

### Overview

```rust
use zcash_client_backend::{
    data_api::wallet::{propose_transfer, create_proposed_transactions, input_selection::GreedyInputSelector},
    fees::{zip317::SingleOutputChangeStrategy, DustOutputPolicy, StandardFeeRule},
    wallet::OvkPolicy,
    zip321::{Payment, TransactionRequest},
};
use zcash_proofs::prover::LocalTxProver;

// 1. Create payment request
let payment = Payment::new(recipient_address, Some(amount), Some(memo), None, None, vec![])?;
let request = TransactionRequest::new(vec![payment])?;

// 2. Create proposal
let input_selector = GreedyInputSelector::new();
let change_strategy = SingleOutputChangeStrategy::new(
    StandardFeeRule::Zip317,
    None,  // change memo
    ShieldedProtocol::Orchard,
    DustOutputPolicy::default(),
);

let proposal = propose_transfer(
    &mut wallet,
    &MainNetwork,
    account_id,
    &input_selector,
    &change_strategy,
    request,
    ConfirmationsPolicy::default(),
)?;

// 3. Load prover (downloads ~50MB params on first use)
let prover = LocalTxProver::with_default_location()?;

// 4. Create and sign transaction
let txids = create_proposed_transactions(
    &mut wallet,
    &MainNetwork,
    &prover,
    &prover,
    &usk,
    OvkPolicy::Sender,
    &proposal,
)?;

// 5. Broadcast
let raw_tx = wallet.get_transaction(txids.first())?;
client.send_transaction(RawTransaction { data: serialize(raw_tx), height: 0 }).await?;
```

### Proving Parameters

`LocalTxProver::with_default_location()` looks for params at:
- `~/.zcash-params/` (Linux/macOS)
- `%APPDATA%\ZcashParams\` (Windows)

Download from: https://download.z.cash/downloads/
- `sapling-spend.params` (~48MB)
- `sapling-output.params` (~3.5MB)

## Memo Handling

### Creating Memos

```rust
use zcash_protocol::memo::{Memo, MemoBytes};

// Text memo (up to 512 bytes)
let memo = Memo::from_str("Your OTP is: 123456")?;
let memo_bytes = MemoBytes::from(memo);

// Empty memo
let empty = MemoBytes::empty();
```

### Reading Memos (Full Decryption)

Compact blocks only have 52 bytes of ciphertext - enough to detect notes but NOT memos. To get memos:

1. Detect note in compact block (fast scan via `scan_cached_blocks`)
2. Fetch full transaction via `client.get_transaction(txid)`
3. Decrypt with full ciphertext

```rust
// After scanning, query received notes from wallet DB
// Then fetch full tx and decrypt:

let tx = Transaction::read(&raw_tx.data[..], BranchId::Nu5)?;
let bundle = tx.sapling_bundle()?;
let output = bundle.shielded_outputs().get(output_idx)?;

let (note, recipient, memo) = try_note_decryption(&domain, &ivk, output)?;
let memo_text = extract_memo_text(&memo);
```

## Common Pitfalls

### 1. Version Conflicts

Multiple versions of crates like `zip32`, `zcash_primitives` get pulled in. Symptoms:
- "expected AccountId, found AccountId"
- "expected Zatoshis, found Zatoshis"

**Solution:** Don't specify versions for transitive deps. Let `zcash_client_backend` and `zcash_client_sqlite` pull in compatible versions. Only add direct deps when absolutely needed.

### 2. rusqlite Not Re-exported

`zcash_client_sqlite` uses rusqlite internally but doesn't re-export it. Add to Cargo.toml:
```toml
rusqlite = "0.37"  # Match zcash_client_sqlite's version
```

### 3. BirthdayError Has No Debug/Display

```rust
// Wrong:
AccountBirthday::from_treestate(ts, None).map_err(|e| anyhow!("{e}"))?;

// Right:
AccountBirthday::from_treestate(ts, None).map_err(|_| anyhow!("Birthday error"))?;
```

### 4. WalletDb Takes 4 Type Parameters

```rust
// Wrong:
WalletDb<Connection, MainNetwork>

// Right:
WalletDb<Connection, MainNetwork, SystemClock, OsRng>
```

### 5. get_wallet_summary Takes ConfirmationsPolicy

```rust
// Wrong:
wallet.get_wallet_summary(0)?

// Right:
wallet.get_wallet_summary(ConfirmationsPolicy::default())?
```

### 6. ChainState Construction

Don't try to use `ChainState::new()` or `ChainState::from_parts()` directly. Use:
```rust
let birthday = AccountBirthday::from_treestate(tree_state, None)?;
let chain_state = birthday.prior_chain_state().clone();
```

## Environment Variables

```bash
LIGHTWALLETD_URL=https://zec.rocks:443   # Mainnet lightwalletd
SEED_HEX=<64-char hex seed>              # 32-byte seed as hex
BIRTHDAY_HEIGHT=2000000                   # Block height when wallet created
ZVS_DATA_DIR=./zvs_data                  # Directory for wallet.db
RUST_LOG=info                            # Logging level
```

## Current Implementation Status

- [x] Connect to lightwalletd via gRPC
- [x] Initialize WalletDb with SQLite persistence
- [x] Create account from seed
- [x] Download compact blocks into MemoryBlockSource
- [x] Scan blocks with `scan_cached_blocks()`
- [x] Query balance via `get_wallet_summary()`
- [x] Generate Sapling receive address
- [ ] Send transactions with memos (placeholder exists)
- [ ] Extract memos from received notes (placeholder exists)
- [ ] Real-time block monitoring loop
- [ ] OTP generation and validation logic

## File Structure

```
ZVS/
├── Cargo.toml          # Dependencies
├── src/
│   ├── lib.rs          # ZVS struct, MemoryBlockSource, wallet logic
│   └── main.rs         # CLI entry point
├── zvs_data/           # Runtime data (gitignored)
│   └── wallet.db       # SQLite wallet database
└── HANDOFF.md          # This document
```

## Resources

- [librustzcash](https://github.com/zcash/librustzcash) - Core Zcash Rust libraries
- [zcash-devtool](https://github.com/zcash/zcash-devtool) - Reference wallet implementation
- [lightwalletd](https://github.com/zcash/lightwalletd) - Light client server
- [ZIP-317](https://zips.z.cash/zip-0317) - Proportional fee mechanism
- [ZIP-315](https://zips.z.cash/zip-0315) - Best practices for wallet implementations
- [docs.rs/zcash_client_backend](https://docs.rs/zcash_client_backend) - API docs
