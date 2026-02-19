# /ui/swap - Swap Composer UI

## Purpose
User interface for cryptocurrency swaps via Defuse Protocol OneClick.
Allows users to receive any token and convert to ZEC.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `SwapComposer` | SwapComposer.tsx | Main swap interface |
| `SwapCurrencyPair` | SwapCurrencyPair.tsx | From/To token selection |
| `SwapQuoteDisplay` | SwapQuoteDisplay.tsx | Quote details and rate |
| `SwapDepositDisplay` | SwapDepositDisplay.tsx | Deposit address & memo |
| `SwapAddressInput` | SwapAddressInput.tsx | Destination Zcash address |
| `SwapSlippageControl` | SwapSlippageControl.tsx | Slippage tolerance setting |

## Swap Flow UI

```
┌─────────────────────────────────────┐
│  From: [ETH ▼] [    1.5    ]       │
│         ↓                           │
│  To:   [ZEC ▼] [   ~245    ]       │
├─────────────────────────────────────┤
│  Rate: 1 ETH = 163.33 ZEC           │
│  Slippage: [0.5%] [1%] [2%]        │
├─────────────────────────────────────┤
│  Deposit to: 0x1234...5678          │
│  [Copy Address] [Show QR]           │
├─────────────────────────────────────┤
│  Your ZEC arrives at:               │
│  u1qw3r...xyz                       │
└─────────────────────────────────────┘
```

## Zcash Integration

### Destination Address
- Must be valid Zcash address
- Unified addresses (u1...) preferred
- Validates using `/ui/signup/zcashAddress.ts`

### Privacy Note
- Swap deposits are on public chains (ETH, etc.)
- Final ZEC receipt can be to shielded address
- Users should understand privacy implications

## State Management
Uses Zustand store at `/lib/stores/swap.ts`:
```typescript
const { fromToken, toToken, quote, deposit } = useSwapStore();
```

## Quote Lifecycle
1. User selects tokens and amount
2. `SwapCurrencyPair` triggers quote fetch
3. `SwapQuoteDisplay` shows rate (expires in ~30s)
4. User confirms → deposit address generated
5. `SwapDepositDisplay` shows where to send

## Testing Harness
- Mock OneClick SDK responses
- Test token selection
- Verify quote display formatting
- Check address validation errors

## Error States
- Quote expired (refresh button)
- Insufficient liquidity
- Invalid destination address
- Network errors
