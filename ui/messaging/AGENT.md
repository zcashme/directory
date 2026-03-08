# /ui/messaging - Memo Composer

## Purpose
Components for composing Zcash transaction memos. Used on profile pages when sending
payments and in the thread composer for emoji autocomplete.

## What the User Sees

### Memo Input
A text area for writing a message to attach to a Zcash payment. Enforces the 512-byte
UTF-8 memo limit. Shows a circular progress indicator when >128 bytes are used, and a
"X bytes remaining" warning when <=20 bytes left. Auto-expands vertically as the user types.

Disabled for transparent addresses (t1.../t3...) since they don't support memos.

Below the memo field: `AmountAndWallet` (amount input with fiat conversion) and `QrUriBlock`
(QR code with `zcash:` URI). The memo is base64url-encoded into the payment URI.

### Emoji Autocomplete
Type `:` followed by a keyword (e.g. `:smile`) to trigger an emoji suggestion dropdown.
Up to 10 matches from `emojilib`. Navigate with Arrow keys, select with Enter, dismiss
with Escape. The dropdown repositions above or below based on viewport space.

Also used by `ThreadComposer` (see `ui/thread/AGENT.md`).

## File -> Feature Map

| File | Feature |
|------|---------|
| `MemoComposer.tsx` | Memo textarea with byte counter, progress ring, auto-expand, base64url encoding, `AmountAndWallet` + `QrUriBlock` subcomponents |
| `useEmojiAutocomplete.ts` | Hook: `:keyword` trigger, `emojilib` search, keyboard nav, viewport-aware placement, text replacement |

## See Also
- `ui/verification/AGENT.md` — `AmountAndWallet` and `QrUriBlock` components (shared)
- `ui/thread/AGENT.md` — `ThreadComposer` uses `useEmojiAutocomplete`
