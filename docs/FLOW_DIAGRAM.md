# 1Click Swap Flow - ANY Token → ZEC

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER STARTS SWAP                              │
│                 (on your zcash.me page)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Select Tokens & Amount                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SwapComposer.jsx                                           │ │
│  │                                                            │ │
│  │  From: [BTC ▼]  Amount: [0.001]                           │ │
│  │  To:   [ZEC ▼]  USD: $67.50                               │ │
│  │                                                            │ │
│  │  Refund Address:  bc1q...                                 │ │
│  │  Destination:     t1abc...                                │ │
│  │  Slippage:        0.5% ▼                                  │ │
│  │                                                            │ │
│  │  [Get Quote]                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ onClick
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Request Quote (dry: true)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ quoteAction.js → oneclickQuote()                          │ │
│  │                                                            │ │
│  │ POST https://1click.chaindefuser.com/v0/quote             │ │
│  │ {                                                          │ │
│  │   dry: true,  // Don't generate deposit address yet       │ │
│  │   swapType: "EXACT_INPUT",                                │ │
│  │   originAsset: "bitcoin.mainnet",                         │ │
│  │   destinationAsset: "zcash.mainnet",                      │ │
│  │   amount: "100000",  // 0.001 BTC in satoshis             │ │
│  │   slippageTolerance: 50,  // 0.5% in basis points         │ │
│  │   ...                                                      │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ response
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Display Quote Preview                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SwapComposer.jsx (quote preview)                          │ │
│  │                                                            │ │
│  │  You send:     0.001 BTC  ($67.50)                        │ │
│  │  You receive:  ~0.293 ZEC ($67.41)                        │ │
│  │  Min out:      0.291 ZEC  (with 0.5% slippage)            │ │
│  │  Time:         ~2-5 minutes                               │ │
│  │                                                            │ │
│  │  [Confirm Swap]                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ onClick
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Confirm & Generate Deposit Address                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ confirmAction.js → oneclickQuote()                        │ │
│  │                                                            │ │
│  │ POST https://1click.chaindefuser.com/v0/quote             │ │
│  │ {                                                          │ │
│  │   dry: false,  // 🔑 Generate real deposit address        │ │
│  │   ... (same params as before)                             │ │
│  │ }                                                          │ │
│  │                                                            │ │
│  │ Response:                                                  │ │
│  │ {                                                          │ │
│  │   quote: {                                                 │ │
│  │     depositAddress: "3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy", │ │
│  │     amountOut: "29300000",  // 0.293 ZEC in zatoshis      │ │
│  │     ...                                                    │ │
│  │   }                                                        │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ depositAddress
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Display Deposit Instructions                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SwapDepositDisplay.jsx                                    │ │
│  │                                                            │ │
│  │  Send exactly 0.001 BTC to:                               │ │
│  │                                                            │ │
│  │  ┌──────────────────────────┐                             │ │
│  │  │   QR CODE                │                             │ │
│  │  │   [bitcoin:3J98t1...]    │                             │ │
│  │  │                          │                             │ │
│  │  └──────────────────────────┘                             │ │
│  │                                                            │ │
│  │  Address: 3J98t1WpEZ73CNmYv...  [Copy] [Save QR]         │ │
│  │                                                            │ │
│  │  ⚠️ Memo/Tag: Not required for BTC                        │ │
│  │                                                            │ │
│  │  [I've Sent Funds]  👈 Line 170                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ User sends BTC
                         │ then clicks button
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Navigate to Status Page                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Navigate to: /swap?depositAddress=3J98t1WpEZ73CNmYv...    │ │
│  │                                                            │ │
│  │ SwapStatusDisplay.jsx loads                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Status Polling Begins                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ swap-provider.jsx (useEffect polling)                     │ │
│  │                                                            │ │
│  │ Polling Strategy:                                          │ │
│  │  • First 5 polls: Every 1 second (aggressive)             │ │
│  │  • After 5 polls: Every 5 seconds (backoff)               │ │
│  │  • Max duration: 5 minutes                                │ │
│  │  • Retries: 3 per failed request                          │ │
│  │                                                            │ │
│  │ GET /api/swap/status?depositAddress=3J98t1...             │ │
│  │   ↓ (proxies to)                                          │ │
│  │ GET https://1click.chaindefuser.com/v0/status?...         │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ poll every 1-5 seconds
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Status Progression                                              │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ PENDING_DEPOSIT  │ ← Before BTC transaction confirms         │
│  └────────┬─────────┘                                           │
│           │ (deposit detected)                                  │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │   PROCESSING     │ ← 1Click executing swap with MM          │
│  └────────┬─────────┘                                           │
│           │ (swap completes)                                    │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │     SUCCESS      │ ← ZEC sent to destination                │
│  └──────────────────┘                                           │
│                                                                  │
│  Other possible states:                                         │
│  • INCOMPLETE_DEPOSIT → Auto refund                             │
│  • REFUNDED → Funds returned to refund address                  │
│  • FAILED → Swap failed, check refund address                   │
└─────────────────────────────────────────────────────────────────┘
```

## File Flow Map

```
User Interaction
    ↓
ui/swap/SwapComposer.jsx
    ↓ (Get Quote)
lib/swap/quoteAction.js
    ↓
lib/swap/swapPayload.js (buildQuotePayload)
    ↓
lib/swap/oneClick.js (oneclickQuote with dry: true)
    ↓ (Confirm)
lib/swap/confirmAction.js
    ↓
lib/swap/oneClick.js (oneclickQuote with dry: false)
    ↓
ui/swap/SwapDepositDisplay.jsx
    ↓ (I've Sent Funds)
app/swap/page.jsx (SwapStatusDisplay)
    ↓ (polling)
app/[slug]/providers/swap-provider.jsx (useEffect)
    ↓
app/api/swap/status/route.js
    ↓
lib/swap/oneClick.js (oneclickStatus)
    ↓ (response)
Update UI with status
```

## Data Flow

### Quote Request Payload
```javascript
{
  dry: true/false,              // false = generate deposit address
  swapType: "EXACT_INPUT",      // Fixed input amount
  slippageTolerance: 50,        // 0.5% in basis points (bp)
  originAsset: "bitcoin.mainnet",
  destinationAsset: "zcash.mainnet",
  amount: "100000",             // In smallest unit (satoshis)
  depositType: "ORIGIN_CHAIN",
  refundTo: "bc1q...",          // BTC refund address
  refundType: "ORIGIN_CHAIN",
  recipient: "t1abc...",        // ZEC destination address
  recipientType: "DESTINATION_CHAIN",
  deadline: "2026-02-07T08:30:00.000Z",  // 20 min from now
  quoteWaitingTimeMs: 3000
}
```

### Quote Response (dry: false)
```javascript
{
  quote: {
    depositAddress: "3J98t1WpEZ...",
    depositMode: "FULL_AMOUNT",
    amountOut: "29300000",           // 0.293 ZEC (zatoshis)
    amountOutFormatted: "0.293",
    amountOutUsd: "67.41",
    minAmountOut: "29155850",        // With 0.5% slippage
    minAmountOutFormatted: "0.291",
    estimatedTimeMs: 180000,         // ~3 minutes
    // ... more fields
  }
}
```

### Status Response
```javascript
{
  status: "PENDING_DEPOSIT",  // or PROCESSING, SUCCESS, etc.
  depositAddress: "3J98t1WpEZ...",
  amountDeposited: "0",      // Updated when deposit detected
  amountOut: "0",            // Updated when swap completes
  // ... transaction details when available
}
```

## Key Implementation Details

### 1. Token Filtering (oneClick.js:48)
Only these tokens are allowed:
- ZEC (Zcash)
- BTC (Bitcoin)
- ETH (Ethereum)
- USDC (USD Coin)
- USDT (Tether)
- SOL (Solana)

Mainnet only (no testnet).

### 2. Slippage Conversion (swapPayload.js:28-34)
User enters: 0.5%
Converted to: 50 basis points (bp)
Formula: percentage × 100 = bp

### 3. Polling Strategy (swap-provider.jsx)
```javascript
// Aggressive phase (first 5 polls)
interval = 1000ms  // 1 second

// Backoff phase (after 5 polls)
interval = 5000ms  // 5 seconds

// Limits
maxDuration = 300000ms  // 5 minutes
maxRetries = 3         // per failed poll
```

### 4. Payment URI Generation (confirmAction.js)
For Bitcoin:
```
bitcoin:3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy?amount=0.001
```

For others (no URI scheme):
```
3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy
```

### 5. Status Tracking
Status tracking URL uses depositAddress as a query parameter:
```javascript
// URL: /swap?depositAddress=3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| API key missing | Return error: "API key not configured" |
| Network timeout | 45 second timeout, return error |
| Invalid addresses | API validates, returns error message |
| Quote fails | Display API error message to user |
| Status 404 | Treat as PENDING_DEPOSIT (not found yet) |
| Polling fails | Retry up to 3 times, then stop |
| Max polling time | Stop after 5 minutes |

## Security Considerations

1. **API Key**: Stored in `.env`, never exposed to client
2. **Server Actions**: Quote/confirm logic runs server-side
3. **Address Validation**: 1Click API validates all addresses
4. **Refund Safety**: Refund address required for all swaps
5. **Deadline**: 20-minute deadline prevents stale swaps
6. **No Private Keys**: Never touches user's private keys

## Testing Strategy

1. **API Level**: Test all three endpoints independently
2. **Integration**: Test full flow without sending funds
3. **UI**: Verify all components render correctly
4. **Polling**: Verify timing and backoff logic
5. **Error Handling**: Simulate failures, verify recovery
6. **Real Swap**: Small test amount with friend

---

**Ready to test?** Follow the checklist in `TESTING_CHECKLIST.md`
