# /ui/messaging - Memo Composer

## Purpose
Components for composing Zcash transaction memos.
Used when sending payments with messages attached.

## Components

### MemoComposer.tsx
Main memo input with character limit:
```tsx
<MemoComposer
  value={memo}
  onChange={setMemo}
  maxLength={512}    // Zcash memo limit
  placeholder="Add a message..."
/>
```

Features:
- Character counter
- Emoji picker integration
- UTF-8 aware length calculation

### useEmojiAutocomplete.ts
Emoji autocomplete hook:
```typescript
const {
  suggestions,
  query,
  select,
  isOpen
} = useEmojiAutocomplete(inputRef);
```

Triggered by `:` character (e.g., `:smile:`).
Uses `emojilib` for emoji lookup.

## Zcash Memo Field

### Constraints
- **Max 512 bytes** after encoding
- UTF-8 encoded
- Stored in shielded transaction
- Only sender and recipient can read

### Encoding
Memos are base64url encoded when constructing URIs:
```typescript
const encoded = btoa(unescape(encodeURIComponent(memo)));
// Used in: zcash:u1...?memo={encoded}
```

## Privacy Features
- Memos are encrypted in shielded transactions
- Only visible to transaction participants
- Blockchain observers cannot read content

## Use Cases
1. **Payment messages** - "Thanks for dinner!"
2. **OTP verification** - `{"otp":"123456"}`
3. **Profile edits** - `{"otp":"...","edits":{...}}`
4. **Thread posts** - Message content + verification

## Character Counting
UTF-8 characters vary in byte size:
```typescript
function getByteLength(str: string): number {
  return new Blob([str]).size;
}
// "Hello" = 5 bytes
// "你好" = 6 bytes
// "🎉" = 4 bytes
```

## Testing Harness
- Test byte limit enforcement
- Verify emoji insertion
- Check encoding roundtrip
- Test max length edge cases
