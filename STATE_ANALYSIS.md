# Profile Page State Analysis - Current vs Swap Mode

## Overview

This document breaks down all states currently used on the profile page and what needs to change to support the cross-chain swap feature.

---

## Current State Architecture

### Context Providers (Global State)

The app uses React Context providers for shared state:

#### 1. **MessagingProvider** (`ui/messaging/messaging-provider.jsx`)
**Purpose:** Manages payment/memo composition state

**Current States:**
```javascript
// Mode: "note" | "signin"
mode: "note"                    // Current view mode
setMode: (mode) => void         // Switch between note/signin

// Draft state (for regular payments)
draft: {
  memo: "",                      // Message text (max 512 bytes)
  amount: "0"                    // ZEC amount as string
}
setDraftMemo: (text) => void    // Update memo
setDraftAmount: (amount) => void // Update amount

// Verify state (for profile verification)
verify: {
  memo: "",                      // Verification memo
  amount: "0",                   // Verification amount
  zId: null,                     // Zcash ID
  requestId: null                // Request ID
}
setVerifyMemo: (text) => void
setVerifyAmount: (amount) => void
setVerifyId: (zId) => void
setVerifyRequestId: (id) => void
```

**Location:** `ui/messaging/messaging-provider.jsx`

---

#### 2. **SelectionProvider** (`ui/profile/selection-provider.jsx`)
**Purpose:** Manages selected address and QR display

**Current States:**
```javascript
selectedAddress: null            // Selected Zcash address (legacy, for NS pages)
setSelectedAddress: (addr) => void
forceShowQR: false               // Force QR code to show
setForceShowQR: (bool) => void
```

**Location:** `ui/profile/selection-provider.jsx`

---

#### 3. **EditsProvider** (`ui/profile/edits-provider.jsx`)
**Purpose:** Manages profile edit state (not directly related to payments)

**Current States:**
```javascript
pendingEdits: {}                 // Pending profile edits
setPendingEdits: (field, value) => void
editChangesRequested: false
setEditChangesRequested: (bool) => void
```

**Location:** `ui/profile/edits-provider.jsx`

---

### Component-Level State

#### 1. **ProfilePageClient** (`ui/profile/ProfilePageClient.jsx`)
**Purpose:** Main profile page container

**Current States:**
```javascript
// From useFeedback() hook:
mode: "note" | "signin"          // Determines which component to show
setMode: (mode) => void
setForceShowQR: (bool) => void

// Component logic:
// - Conditionally renders MemoComposer or ProfileVerification based on mode
// - Listens for window events: "forceFeedbackNoteMode"
```

**No local useState** - uses context only

---

#### 2. **MemoComposer** (`ui/messaging/MemoComposer.jsx`)
**Purpose:** Payment/memo composition component

**Current States:**
```javascript
// From useFeedback() hook:
forceShowQR: boolean             // Force QR display

// From useFeedbackController(profile?.address):
uri: string                      // Generated Zcash URI (zcash:...)
memo: string                     // Current memo text
amount: string                   // Current amount ("0.000")
openWallet: () => void          // Open wallet callback
setDraftMemo: (text) => void    // Update memo
setDraftAmount: (amount) => void // Update amount

// Local useState:
const [search, setSearch] = useState("")           // Profile search input
const [showList, setShowList] = useState(false)   // Show search dropdown
const [isFocused, setIsFocused] = useState(false)  // Search input focused

// Computed (not state):
const disabled = profile?.address?.startsWith("t") // Memo disabled for transparent addresses
const recipientName = profile?.display_name || profile?.name || "Recipient"
```

**Location:** `ui/messaging/MemoComposer.jsx`

---

#### 3. **AmountAndWallet** (`ui/verification/AmountAndWallet.jsx`)
**Purpose:** Amount input and USD conversion

**Current States:**
```javascript
// Props (from parent):
amount: string                   // Current amount
setAmount: (amount) => void     // Update amount callback
openWallet: () => void         // Open wallet callback
showOpenWallet: boolean        // Show "Open in Wallet" button
showUsdPill: boolean           // Show USD conversion pill
showRateMessage: boolean       // Show rate source message

// Local useState:
const [isUsdOpen, setIsUsdOpen] = useState(false)        // USD pill expanded
const [isCurrencyOpen, setIsCurrencyOpen] = useState(false) // Currency dropdown open
const [fiat, setFiat] = useState("USD")                // Selected fiat currency
const [rate, setRate] = useState(1)                    // Exchange rate
const [rateSource, setRateSource] = useState("API")     // Rate source name
const [rateFetched, setRateFetched] = useState(false)   // Rate fetch success
const [rateRequested, setRateRequested] = useState(false) // Rate fetch initiated
const [usdInput, setUsdInput] = useState("")           // USD input value

// Hardcoded:
// - Token display: "ZEC ▼" (line 183) - NOT a dropdown, just text
```

**Location:** `ui/verification/AmountAndWallet.jsx`

---

## Current State Flow

```
ProfilePageClient
    ↓ (uses useFeedback hook)
MessagingContext (mode, draft, verify)
    ↓ (passes profile prop)
MemoComposer
    ↓ (uses useFeedbackController)
    - Reads: draft.memo, draft.amount
    - Writes: setDraftMemo, setDraftAmount
    ↓ (passes amount, setAmount props)
AmountAndWallet
    - Local state: fiat, rate, USD conversion
    - Hardcoded: "ZEC ▼" display
```

---

## What Needs to Change for Swap Mode

### New States to Add

#### 1. **Swap State in MemoComposer** (NEW)

**Add to `MemoComposer.jsx`:**

```javascript
// Token selection state
const [tokenOptions, setTokenOptions] = useState([])      // Available tokens from API
const [originTokenId, setOriginTokenId] = useState(null)  // Selected source token ID
const [zecTokenId, setZecTokenId] = useState(null)       // ZEC token ID (destination)
const [originSymbol, setOriginSymbol] = useState("ZEC")  // Display symbol (BTC, ETH, etc.)

// Swap workflow state
const [refundAddress, setRefundAddress] = useState("")    // User's refund address
const [slippageTolerance, setSlippageTolerance] = useState("0.5") // Slippage %

// Quote/Confirm state
const [quoteData, setQuoteData] = useState(null)          // Quote response
const [quoteStatus, setQuoteStatus] = useState("")        // UI status message
const [depositUri, setDepositUri] = useState("")          // Payment URI for QR
const [statusKey, setStatusKey] = useState(null)           // {depositAddress, depositMemo}
const [swapStatus, setSwapStatus] = useState(null)        // PENDING | SUCCESS | FAILED | REFUNDED

// Loading states
const [isQuoting, setIsQuoting] = useState(false)         // Quote in progress
const [isConfirming, setIsConfirming] = useState(false)   // Confirm in progress
const [isLoadingTokens, setIsLoadingTokens] = useState(false) // Loading token list

// Computed (derived from state):
const isSwapMode = originTokenId !== zecTokenId           // Requires swap (false = ZEC mode, true = swap mode)
const disabled = profile?.address?.startsWith("t") || isSwapMode // Memo disabled (transparent OR swap mode)
// Note: Use !isSwapMode wherever we need to check for ZEC mode
```

**Location:** `ui/messaging/MemoComposer.jsx`

---

#### 2. **Token Selector State in AmountAndWallet** (NEW)

**Add to `AmountAndWallet.jsx`:**

```javascript
// New props (from MemoComposer):
asset: string                    // Current selected token symbol (default "ZEC")
assetOptions: Array<{            // Available tokens
  id: string,
  symbol: string,
  label: string,
  logo: string,
  chain: string,
  decimals: number
}>
setAsset: (tokenId) => void       // Callback when token selected

showRefund: boolean              // Show refund address input
refundAddress: string            // Refund address value
setRefundAddress: (addr) => void // Update refund address

// Local state for token selector:
const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false)
const [tokenSearch, setTokenSearch] = useState("")        // Search filter

// Update rate fetching:
// Change from: fetchRate(fiat)
// To: fetchRate(fiat, asset)  // Pass asset parameter
```

**Location:** `ui/verification/AmountAndWallet.jsx`

---

#### 3. **Update URI Generation** (MODIFY)

**Current in `useFeedbackController`:**

```javascript
// Line 122-126 in useFeedback.js
const uri = useMemo(() => {
  const { memo, amount } = draft;
  const finalAmount = amount && amount !== "0" ? amount : "0";
  return buildZcashUri(effectiveAddress, finalAmount, memo);
}, [effectiveAddress, draft]);
```

**Needs to change:**

```javascript
// In MemoComposer.jsx, replace uri from useFeedbackController:
const uri = useMemo(() => {
  if (isSwapMode && depositUri) {
    return depositUri;  // Use deposit URI (bitcoin:...) in swap mode
  }
  // Fall back to Zcash URI for ZEC mode (!isSwapMode)
  return buildZcashUri(profile?.address, amount, memo);
}, [isSwapMode, depositUri, profile?.address, amount, memo]);
```

---

## State Flow Changes

### Current Flow (ZEC Mode Only):
```
User types amount
    ↓
setDraftAmount(amount)
    ↓
draft.amount updated in MessagingContext
    ↓
useFeedbackController rebuilds URI
    ↓
QR code shows Zcash URI
```

### New Flow (Swap Mode):
```
User selects BTC token
    ↓
setOriginTokenId("btc-token-id")
    ↓
isSwapMode = true (computed)
    ↓
Memo disabled, refund input appears
    ↓
User enters amount + refund address
    ↓
Auto-confirm triggers (debounced 800ms)
    ↓
POST /api/swap/confirm
    ↓
setDepositUri("bitcoin:bc1...")
    ↓
QR code shows Bitcoin deposit URI
    ↓
Status polling starts
    ↓
Poll GET /api/swap/status every 6s
    ↓
setSwapStatus("PENDING" → "SUCCESS")
```

---

## Detailed State Changes

### 1. MemoComposer State Changes

| Current State | New State | Change Type |
|--------------|-----------|-------------|
| `disabled` (computed from address) | `disabled` (computed from address OR swap mode) | **MODIFY** |
| `uri` (from useFeedbackController) | `uri` (conditional: depositUri OR zcashUri) | **MODIFY** |
| - | `tokenOptions` | **ADD** |
| - | `originTokenId` | **ADD** |
| - | `zecTokenId` | **ADD** |
| - | `originSymbol` | **ADD** |
| - | `refundAddress` | **ADD** |
| - | `slippageTolerance` | **ADD** |
| - | `quoteData` | **ADD** |
| - | `depositUri` | **ADD** |
| - | `statusKey` | **ADD** |
| - | `swapStatus` | **ADD** |
| - | `isQuoting` | **ADD** |
| - | `isConfirming` | **ADD** |
| - | `isSwapMode` (computed) | **ADD** |

---

### 2. AmountAndWallet State Changes

| Current State | New State | Change Type |
|--------------|-----------|-------------|
| Hardcoded "ZEC ▼" | Token selector dropdown | **REPLACE** |
| `fetchRate(fiat)` | `fetchRate(fiat, asset)` | **MODIFY** |
| - | `asset` prop | **ADD** |
| - | `assetOptions` prop | **ADD** |
| - | `setAsset` prop | **ADD** |
| - | `showRefund` prop | **ADD** |
| - | `refundAddress` prop | **ADD** |
| - | `setRefundAddress` prop | **ADD** |
| - | `isTokenDropdownOpen` | **ADD** |
| - | `tokenSearch` | **ADD** |

---

### 3. Context Provider Changes

| Provider | Current State | New State | Change Type |
|----------|--------------|-----------|-------------|
| MessagingProvider | `draft: {memo, amount}` | Same (no change) | **NO CHANGE** |
| MessagingProvider | `mode: "note" \| "signin"` | Same (no change) | **NO CHANGE** |
| SelectionProvider | All states | Same (no change) | **NO CHANGE** |
| EditsProvider | All states | Same (no change) | **NO CHANGE** |

**Note:** Context providers don't need changes. Swap state is local to `MemoComposer` component.

---

## Implementation Priority

### Phase 1: Add Swap State (Foundation)
1. ✅ Add token selection state to `MemoComposer`
2. ✅ Add swap workflow state (refund, quote, confirm, status)
3. ✅ Add computed mode detection (`isSwapMode` - use `!isSwapMode` for ZEC mode checks)

### Phase 2: Update AmountAndWallet
1. ✅ Add token selector dropdown (replace hardcoded "ZEC ▼")
2. ✅ Add refund address input
3. ✅ Update rate fetching to support asset parameter

### Phase 3: Update URI Logic
1. ✅ Conditionally use `depositUri` in swap mode
2. ✅ Fall back to Zcash URI in ZEC mode

### Phase 4: Add Auto-Confirm
1. ✅ Implement debounced auto-confirm on field changes
2. ✅ Handle quote/confirm API calls

### Phase 5: Add Status Polling
1. ✅ Poll swap status every 6 seconds
2. ✅ Update UI based on status

---

## Key Decisions

### 1. Where to Store Swap State?

**Decision:** Local state in `MemoComposer` component (not in context)

**Reasoning:**
- Swap state is specific to one payment flow
- Doesn't need to be shared across components
- Simpler than adding to global context
- Can be reset when user switches profiles

### 2. How to Handle URI Generation?

**Decision:** Conditional logic in `MemoComposer` component

**Reasoning:**
- `useFeedbackController` generates Zcash URIs (keep as-is)
- Swap mode needs Bitcoin URIs (different format)
- MemoComposer can decide which URI to use based on mode

### 3. How to Handle Token Selection?

**Decision:** Add props to `AmountAndWallet` component

**Reasoning:**
- Token selector is part of amount input UI
- Keeps related UI together
- MemoComposer manages state, AmountAndWallet displays it

---

## Summary

### Current States: **13 total**
- Context: 8 states (mode, draft, verify, selectedAddress, forceShowQR, pendingEdits)
- MemoComposer: 3 local states (search, showList, isFocused)
- AmountAndWallet: 7 local states (USD conversion, rates)

### New States to Add: **15 total**
- MemoComposer: 12 new states (tokens, swap workflow, status)
- AmountAndWallet: 3 new states (token selector, refund input)

### States to Modify: **3 total**
- MemoComposer: `disabled` (add swap mode check)
- MemoComposer: `uri` (conditional logic)
- AmountAndWallet: `fetchRate` (add asset parameter)

---

*Last Updated: 2026-02-05*
*Status: Analysis Complete - Ready for Implementation*
