# /lib/zcash - Zcash Utilities

## Purpose
Core Zcash blockchain utilities: address validation, URI construction, memo encoding.
This is the most critical module for Zcash-specific functionality.

## Main File: zcashUtils.ts

### Address Validation

```typescript
validateZcashAddress(address: string): {
  valid: boolean;
  addressType: 'unified' | 'sapling' | 'transparent' | 'tex' | 'viewing_key' | 'invalid';
  reason?: string;
}
```

**Address Formats:**
| Prefix | Type | Privacy | Recommendation |
|--------|------|---------|----------------|
| `u1` | Unified | High | Recommended |
| `zs1` | Sapling | High | Acceptable |
| `t1`, `t3` | Transparent | None | Show warning |
| `tex1` | TEX | None | Discouraged |
| `uview`, `zview` | Viewing Key | N/A | Reject |

### URI Construction

```typescript
buildZcashUri(address: string, amount?: number, memo?: string): string
// Returns: zcash:u1abc...?amount=0.001&memo=base64encoded
```

Used for QR codes and wallet deep links. Memo is base64url encoded.

### Edit Memo Encoding

```typescript
buildZcashEditMemo(otp: string, edits: ProfileEdits): string
// Returns compact JSON for blockchain memo field (max 512 bytes)
```

Format: `{"otp":"123456","edits":{"name":"Alice"}}`
Must fit in Zcash memo field - keep edits minimal.

### Helper: getZcashAddressHint()
Returns user-friendly guidance for each address type.
Used in UI to educate users about privacy implications.

## Dependencies
- `bech32` / `bech32m` - Unified/Sapling address decoding
- `bs58check` - Transparent address validation

## Testing Harness
Pure functions - ideal for unit testing:
```typescript
// Example test
expect(validateZcashAddress('u1abc...')).toEqual({
  valid: true,
  addressType: 'unified'
});
```

## Common Patterns
- Always validate before displaying/storing addresses
- Unified addresses preferred - nudge users toward privacy
- Memo encoding must handle UTF-8 properly
