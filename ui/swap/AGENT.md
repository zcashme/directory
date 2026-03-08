# /ui/swap - Swap Composer UI

## Purpose
Client-side components for the cross-chain swap form. Users select a token, enter an
amount, and receive a deposit address with QR code. The flow auto-advances — no manual
"confirm" step. Available at swap.zcash.me and embedded in profile page payment composers.

## What the User Sees

### Swap Form
A compact form with: token selector (colored circle icons), amount input with USD
conversion, inline slippage control (presets: 0.1%, 0.5%, 1%, 2%, 5% + custom), and
a refund address field. The memo field is visible but disabled (future ZEC messaging).

### Auto-Flow
Once the user enters a valid amount and refund address, the system automatically:
1. Fetches a quote (shows "Getting quote..." with bouncing dots)
2. Displays the quote (send amount, receive amount, USD value, min received, estimated time)
3. Confirms the quote (shows "Confirming quote..." spinner)
4. Shows the deposit display with QR code and exact amount to send

No buttons needed between steps — the flow triggers automatically when inputs are valid.

### Deposit Display
After confirmation: bold headline ("Send exactly X.XX BTC below"), recipient receive
range, estimated time, QR code (scannable payment URI), copyable deposit address, and
two buttons: "Get New Quote" and "I Sent It!" (opens swap status page).

## File -> Feature Map

| File | Feature |
|------|---------|
| `SwapComposer.tsx` | Master orchestration: token/amount/refund inputs, auto-quote + auto-confirm flow, animated step transitions (AnimatePresence), scroll management |
| `SwapCurrencyPair.tsx` | Token pair display with colored circle icons (BTC=orange, ETH=blue, ZEC=yellow, etc.), arrow between, configurable sizes (sm/md/lg) |
| `SwapAddressInput.tsx` | Text input for refund/destination addresses with FormField wrapper |
| `SwapDepositDisplay.tsx` | Deposit address + QR code, exact amount headline, "Get New Quote" / "I Sent It!" buttons |
| `SwapQuoteDisplay.tsx` | Quote preview: send/receive amounts, USD value, minimum received, estimated time, slippage |
| `SwapSlippageControl.tsx` | Slippage tolerance: 5 preset buttons + custom input, collapsible or inline variant |

## See Also
- `lib/swap/AGENT.md` — 1Click SDK integration, quote/confirm server actions, token filtering
