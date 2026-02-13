# Orchard Upgrade for ZVS

## Current State (Sapling-only)

### Address Derivation (`src/lib.rs:606`)
```rust
sapling_dfvk.default_address()  // Returns zs1... address
```

### Balance Tracking (`src/lib.rs:314`)
```rust
balance.sapling_balance().spendable_value()
// Comment notes: "If you're using Orchard, you'd also add balance.orchard_balance().spendable_value()"
```

### Transaction Creation (`src/lib.rs:440`)
```rust
ShieldedProtocol::Sapling  // Hardcoded to Sapling only
```

### Cargo.toml Features
```toml
zcash_keys = { path = "librustzcash/zcash_keys", features = ["sapling"] }
```

---

## Required Changes for Orchard

### 1. Enable Orchard feature in Cargo.toml
```toml
zcash_keys = { path = "librustzcash/zcash_keys", features = ["sapling", "orchard"] }
```

### 2. Derive Unified Address instead of Sapling
```rust
// Instead of sapling_dfvk.default_address()
let ua = usk.to_unified_full_viewing_key()
    .default_address(request)  // Returns unified address (u-prefix)
```

### 3. Update Balance Queries
```rust
let total = balance.sapling_balance().spendable_value()
          + balance.orchard_balance().spendable_value();
```

### 4. Support Both Protocols in Transactions
```rust
// Allow sending via Orchard when available
ShieldedProtocol::Orchard  // or let backend choose automatically
```

### 5. Update Memo Validation (`src/memo_rules.rs:121-126`)
Already supports unified addresses:
```rust
if !user_address.starts_with("zs") && !user_address.starts_with("u") {
    return None;
}
```

---

## Key Types from librustzcash

| Crate | Type | Purpose |
|-------|------|---------|
| `zcash_keys` | `UnifiedSpendingKey` | Derives both Sapling + Orchard keys |
| `zcash_keys` | `UnifiedFullViewingKey` | View-only access to both pools |
| `zcash_keys` | `UnifiedAddress` | Combined address (u-prefix) |
| `zcash_client_backend` | `ShieldedProtocol::Orchard` | Protocol selector |
| `zcash_primitives` | `orchard_balance()` | Orchard pool balance |

---

## Files to Modify

1. `Cargo.toml` - Add orchard feature
2. `src/lib.rs` - Address derivation, balance, tx creation
3. `src/memo_rules.rs` - Already compatible

---

## Notes

- `zcash_client_backend` sync engine already decrypts Orchard outputs if keys are present
- Unified addresses encode both Sapling + Orchard receivers
- Senders automatically pick the best pool (Orchard preferred)
