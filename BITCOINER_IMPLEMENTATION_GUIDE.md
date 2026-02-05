# Cross-Chain Token Swap Feature - Complete Implementation Guide

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Story & Requirements](#user-story--requirements)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)
6. [File Summary](#file-summary)

---

## Feature Overview

### What It Does

The **cross-chain token swap feature** enables users to send payments to Zcash addresses using other cryptocurrencies (like Bitcoin, Ethereum, etc.) by automatically swapping them to ZEC through the 1Click API.

**Key Capabilities:**
1. **Select any supported cryptocurrency** (BTC, ETH, etc.) as the payment source
2. **Automatically swap** the selected token to ZEC via the 1Click API
3. **Send the swapped ZEC** to the recipient's Zcash address
4. **Track swap status** in real-time until completion

### Key User Flow

1. User navigates to `zcash.me/<name>` (e.g., `zcash.me/smit`)
2. User selects a source token from dropdown (e.g., BTC instead of ZEC)
3. User enters amount and refund address
4. **System automatically fetches quote and confirms swap** (debounced on changes)
5. System generates QR code with deposit instructions for the source token
6. **System displays recipient's ZEC u-address** (below QR, with copy button)
7. User pays using their wallet (e.g., Bitcoin wallet) to the deposit address
8. System polls swap status until completion
9. Once complete, ZEC is delivered to the recipient's shielded u-address

**Note:** The system can also support manual "Get Quote" → "Confirm Quote" flow for explicit user control, but the primary flow is automatic on field changes.

### Key Innovation

Instead of requiring users to manually swap tokens before sending, the system handles the swap automatically, making it seamless for users who don't hold ZEC directly.

---

## User Story & Requirements

### Core User Story

**As a user**, I want to send payments to Zcash addresses using cryptocurrencies I already hold (like Bitcoin), so that I don't need to acquire ZEC first.

### Functional Requirements

#### ✅ Core Functionality (Verified)

- ✅ **Origin asset dropdown**: Shows tokens from 1Click API
- ✅ **Destination fixed to ZEC**: Always swaps to ZEC
- ✅ **Deposit address on origin chain**: Deposit address is for origin asset (e.g., `bc1...` for BTC)
- ✅ **Receiver gets ZEC**: Swap always delivers to ZEC address
- ✅ **Shielded u-address**: Uses recipient's shielded address (`profile?.address`)
- ✅ **Refund address collection**: Required field in swap mode
- ✅ **Quote/Confirm flow**: Supports both manual and automatic flows
- ✅ **Status polling**: Polls `/api/swap/status` every 6 seconds
- ✅ **Full lifecycle**: quote → confirm → deposit → poll → success/fail
- ✅ **Memo disabled in swap mode**: Memos only work with ZEC
- ✅ **ZEC flow preserved**: Original ZEC payment flow remains unchanged

#### ⚠️ Critical Requirements

**1. Auto-Confirm on Changes (Debounced)**
- **Requirement**: On amount/origin/recipient/refund address change, automatically call `/api/swap/confirm` (debounced ~800ms)
- **Status**: ⚠️ **REQUIRED** - Must be implemented
- **Implementation**: Use `useEffect` with debounce to auto-confirm when:
  - `amount` changes
  - `originTokenId` changes
  - `profile?.address` changes
  - `refundAddress` changes (if in swap mode)
- **Debounce delay**: 800ms recommended
- **Conditions**: Only auto-confirm if all required fields are present

**2. Recipient ZEC Address Display**
- **Requirement**: Show recipient's shielded ZEC u-address below/behind QR code with copy button
- **Status**: ⚠️ **REQUIRED** - Must be implemented
- **Implementation**: 
  - Display `profile?.address` (recipient's shielded ZEC u-address)
  - Add copy button next to address
  - Label: "Recipient will receive ZEC at:" or similar
  - Make it clear this is where ZEC will be delivered after swap completes

**3. Quote Auto-Update**
- **Requirement**: Quote updates when origin asset or amount changes
- **Status**: ⚠️ **RECOMMENDED** - Can auto-fetch quote for preview
- **Implementation**: Auto-fetch quote (dry: true) on changes, then auto-confirm when ready

### Technical Requirements

- ✅ **Server-side token fetching**: `/api/swap/tokens` endpoint
- ✅ **Payment URI generation**: Bitcoin URIs for BTC, address-only for others
- ✅ **Stateless status polling**: Uses `depositAddress` + `depositMemo`
- ✅ **No client-side API keys**: All 1Click calls are server-side
- ✅ **Environment variables**: `ONECLICK_API_KEY` required

### UI/UX Requirements

- **Token Selection**: Searchable dropdown with token logos, keyboard navigation
- **Quote Display**: Side-by-side comparison (From → To), amounts in tokens and USD
- **Slippage Controls**: Preset buttons (0.1%, 0.5%, 1%, 2%, 5%) + custom input
- **Status Indicators**: Color-coded messages, loading states, error handling
- **QR Code**: Uses `paymentUri` from confirm response, falls back to deposit address
- **Recipient Address**: Prominently displayed below QR with copy button

---

## Technical Architecture

### Component Structure (Updated for dev/jules)

#### A. `MemoComposer.jsx` (Enhanced)
**Location:** `ui/messaging/MemoComposer.jsx`

**Key Additions:**
- **Token selection state management**
  - `tokenOptions`: List of available tokens from API
  - `originTokenId`: Selected source token (e.g., BTC)
  - `zecTokenId`: ZEC token ID (always the destination)
  - `originSymbol`: Display symbol for source token

- **Swap mode detection**
  - `isZecMode`: When source token = ZEC (direct payment, no swap)
  - `isSwapMode`: When source token ≠ ZEC (requires swap)

- **Swap workflow state**
  - `refundAddress`: User's refund address for failed swaps
  - `slippageTolerance`: Slippage percentage (default 0.5%)
  - `quoteData`: Quote response from API
  - `quoteStatus`: UI status messages
  - `depositUri`: Payment URI for QR code
  - `statusKey`: `{depositAddress, depositMemo}` for polling
  - `swapStatus`: Current swap status

- **Key Functions:**
  - `loadTokens()`: Fetches available tokens from `/api/swap/tokens`
  - `handleGetQuote()`: Fetches swap quote from `/api/swap/quote` (optional, for preview)
  - `handleConfirmQuote()`: Manually confirms swap and gets deposit instructions
  - `handleAutoConfirm()`: **Auto-confirms swap on changes** (debounced ~800ms)
  - `pollSwapStatus()`: Polls `/api/swap/status` until completion
  - `cancelSwapToZec()`: Cancels swap mode, returns to ZEC

**Auto-Confirm Behavior:**
- Automatically calls `/api/swap/confirm` when any of these change:
  - `amount` (debounced)
  - `originTokenId` (token selection)
  - `profile?.address` (recipient)
  - `refundAddress` (if in swap mode)
- Only triggers if all required fields are present
- Generates deposit address + payment URI automatically
- User can still manually trigger quote/confirm if needed

**UI Changes:**
- Token selector dropdown in `AmountAndWallet` component
- Refund address input field (shown only in swap mode)
- Slippage tolerance controls (presets: 0.1%, 0.5%, 1%, 2%, 5%)
- Quote display card showing swap details (optional preview)
- QR code displaying deposit payment URI
- **Recipient ZEC u-address display** (below QR, with copy button)
- "Get Quote" and "Confirm Quote" buttons (optional, for manual control)
- Swap status indicator
- Memo field disabled in swap mode (memos only work with ZEC)

#### B. `AmountAndWallet.jsx` (Enhanced)
**Location:** `ui/verification/AmountAndWallet.jsx`

**Key Additions:**
- **Asset selector dropdown**
  - `assetOptions`: Array of `{id, symbol, label, logo}` objects
  - `setAsset`: Callback when token is selected
  - Searchable dropdown with keyboard navigation
  - Token logos displayed when available

- **Refund address input**
  - `showRefund`: Boolean to show/hide refund field
  - `refundLabel`: Dynamic label based on source token
  - `refundAddress` / `setRefundAddress`: State management

- **Rate fetching**
  - Fetches exchange rates from `/api/rates?fiat=X&asset=Y`
  - Supports multiple fiat currencies
  - Auto-updates every 60 seconds
  - Shows rate source (Coinbase, CoinGecko, etc.)

### API Routes

#### A. `/api/swap/tokens` (GET)
**Location:** `app/api/swap/tokens/route.js`

**Purpose:** Fetch list of available tokens from 1Click API

**Response:**
```json
{
  "ok": true,
  "data": {
    "tokens": [
      {
        "id": "token-id",
        "symbol": "BTC",
        "ticker": "BTC",
        "chain": "bitcoin",
        "decimals": 8,
        "logo": "https://..."
      }
    ]
  }
}
```

**Implementation:**
- Calls `oneclickTokens()` from `lib/oneClick.js`
- Returns normalized token list
- Caches tokens for 5 minutes (300 seconds)

#### B. `/api/swap/quote` (POST)
**Location:** `app/api/swap/quote/route.js`

**Purpose:** Get a dry-run quote for a swap (no actual swap created)

**Request Body:**
```json
{
  "fromToken": "token-id",
  "toToken": "zec-token-id",
  "amountIn": "0.001",
  "destAddress": "zs1...",
  "refundAddress": "bc1...",
  "slippageTolerance": "0.5"
}
```

**Response:**
```json
{
  "ok": true,
  "quoteId": "quote-123",
  "quote": { /* raw quote from 1Click */ },
  "display": {
    "fromSymbol": "BTC",
    "toSymbol": "ZEC",
    "amountInFormatted": "0.001",
    "amountOutFormatted": "0.045",
    "amountInUsd": 65.50,
    "amountOutUsd": 2.95,
    "timeEstimate": "5-10 minutes"
  }
}
```

**Implementation:**
- Builds payload using `buildQuotePayload()` from `lib/swapPayload.js`
- Sets `dry: true` for quote-only request
- Calls `oneclickQuote()` from `lib/oneClick.js`
- Normalizes response with `quoteObj()` helper

#### C. `/api/swap/confirm` (POST)
**Location:** `app/api/swap/confirm/route.js`

**Purpose:** Confirm a swap and get deposit instructions (creates actual swap)

**Request Body:** Same as quote, optionally includes `quoteId`

**Response:**
```json
{
  "ok": true,
  "swapId": "uuid",
  "deposit": {
    "address": "bc1...",
    "memo": null,
    "amountDecimal": "0.001",
    "amountBaseUnits": "100000",
    "originAsset": "token-id",
    "decimals": 8
  },
  "paymentUri": "bitcoin:bc1...?amount=0.001",
  "statusKey": {
    "depositAddress": "bc1...",
    "depositMemo": null
  },
  "display": {
    "amountInFormatted": "0.001 BTC",
    "amountOutFormatted": "0.045 ZEC"
  }
}
```

**Implementation:**
- Sets `dry: false` to create actual swap
- Extracts deposit fields using `extractDepositFields()`
- Builds payment URI (bitcoin: URI for BTC, address-only for others)
- Converts base units to decimal using `baseUnitsToDecimal()`
- Validates BTC addresses for BTC swaps

#### D. `/api/swap/status` (GET)
**Location:** `app/api/swap/status/route.js`

**Purpose:** Poll swap status using deposit address

**Query Parameters:**
- `depositAddress` (required): Deposit address from confirm response
- `depositMemo` (optional): Memo if required

**Response:**
```json
{
  "ok": true,
  "status": {
    "status": "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED",
    "data": { /* additional status data */ }
  }
}
```

**Implementation:**
- Calls `oneclickStatus()` with deposit address
- Stateless (works in serverless environments)
- Returns retryable errors for temporary failures

### Library Files

#### A. `lib/oneClick.js`
**Purpose:** Client for 1Click API integration

**Exports:**
- `oneclickTokens()`: Fetch available tokens
- `oneclickQuote(payload)`: Get quote or confirm swap
- `oneclickStatus(params)`: Check swap status

**Configuration:**
- `ONECLICK_BASE_URL`: API base URL (default: `https://1click.chaindefuser.com`)
- `ONECLICK_API_KEY`: Bearer token for authentication
- `ONECLICK_TIMEOUT_SECONDS`: Request timeout (default: 45s)

**Features:**
- Token caching (5 minutes TTL)
- Request timeout handling
- Error handling with retryable flags

#### B. `lib/swapPayload.js`
**Purpose:** Utilities for building swap payloads and parsing responses

**Exports:**
- `findToken(tokensPayload, tokenId)`: Find token by ID
- `toBaseUnits(amountStr, decimals)`: Convert decimal to base units
- `baseUnitsToDecimal(amountBase, decimals)`: Convert base units to decimal
- `buildQuotePayload(body, options)`: Build 1Click API payload
- `quoteObj(resp)`: Extract quote object from response
- `extractDepositFields(resp)`: Extract deposit address/memo

**Key Functions:**

**`buildQuotePayload()`:**
- Validates required fields: `fromToken`, `toToken`, `amountIn`, `destAddress`, `refundAddress`
- Converts amount to base units based on token decimals
- Sets slippage tolerance (basis points, 0-10000)
- Sets deadline (20 minutes from now)
- Returns payload matching 1Click API spec

**`toBaseUnits()` / `baseUnitsToDecimal()`:**
- Handles decimal precision conversion
- Avoids floating-point errors
- Supports up to 8 decimal places

### Data Flow

```
User selects token (e.g., BTC)
    ↓
Load tokens from /api/swap/tokens
    ↓
User enters amount + refund address
    ↓
Auto-confirm (debounced) → POST /api/swap/confirm
    ↓
Receive deposit address + payment URI
    ↓
Display QR code with deposit instructions
    ↓
Display recipient ZEC address (below QR)
    ↓
User pays from their wallet
    ↓
Poll GET /api/swap/status every 6 seconds
    ↓
Status: PENDING → SUCCESS/FAILED/REFUNDED
    ↓
Swap complete, ZEC delivered to recipient
```

### State Management

**Swap State (in MemoComposer):**
- Token selection: `originTokenId`, `zecTokenId`, `originSymbol`
- Quote state: `quoteData`, `quoteStatus`, `isQuoting`
- Confirmation state: `depositUri`, `statusKey`, `isConfirming`
- Status polling: `swapStatus`, polling interval (6s)

**Mode Detection:**
- `isZecMode`: Direct ZEC payment (no swap, memos enabled)
- `isSwapMode`: Cross-chain swap (memos disabled, refund required)

### Error Handling

**API Errors:**
- All routes return `{ok: false, error: "...", retryable: true/false}`
- Frontend displays error messages in status fields
- Retryable errors allow continued polling

**Validation:**
- Required fields checked before API calls
- Amount validation (must be > 0)
- Address format validation (BTC addresses for BTC swaps)
- Slippage tolerance bounds (0-10000 basis points)

### Key Differences from Direct ZEC Payment

| Feature | Direct ZEC | Swap Mode |
|---------|-----------|-----------|
| Memo support | ✅ Enabled | ❌ Disabled |
| Refund address | ❌ Not needed | ✅ Required |
| Quote required | ❌ No | ✅ Yes |
| Status polling | ❌ No | ✅ Yes (6s interval) |
| Payment URI | Zcash URI | Source token URI (e.g., bitcoin:) |
| QR code content | Zcash address | Deposit address (source chain) |

---

## Implementation Plan

### Prerequisites

#### 1. Environment Setup
- [ ] Obtain 1Click API key from `https://1click.chaindefuser.com`
- [ ] Add environment variables to `.env.local`:
  ```bash
  ONECLICK_API_KEY=your-api-key-here
  ONECLICK_BASE_URL=https://1click.chaindefuser.com  # optional, defaults to this
  ONECLICK_TIMEOUT_SECONDS=45  # optional, defaults to 45
  ```

#### 2. Codebase Understanding
- [ ] Review current `MemoComposer.jsx` implementation (`ui/messaging/MemoComposer.jsx`)
- [ ] Review current `AmountAndWallet.jsx` component (`ui/verification/AmountAndWallet.jsx`)
- [ ] Understand API route structure in `app/api/`
- [ ] Understand library structure in `lib/`
- [ ] Review `useFeedback` hook (`ui/messaging/useFeedback.js`) - contains `useFeedbackController()`

**Key Structure Notes:**
- Main component: `ui/messaging/MemoComposer.jsx` (formerly `ZcashFeedbackDraft.jsx`)
- Component receives `profile` prop (not context-based `selectedAddress`)
- Hooks are in `ui/messaging/useFeedback.js` (includes `useFeedbackController()`)
- Components use light theme styling (gray-800, blue-600, etc.)

---

### Phase 1: Backend Infrastructure (Foundation)
**Goal:** Create all backend API routes and library utilities  
**Estimated Time:** 4-6 hours  
**Dependencies:** None (can be tested independently)

#### 1.1 Create Library Files

**File:** `lib/oneClick.js`
- [ ] Create file with 1Click API client functions
- [ ] Implement `oneclickTokens()` - Fetch tokens with 5-minute caching
- [ ] Implement `oneclickQuote(payload)` - Get quote or confirm swap
- [ ] Implement `oneclickStatus(params)` - Check swap status
- [ ] Add error handling with retryable flags
- [ ] Add timeout handling (45s default)
- [ ] Add authentication (Bearer token)
- [ ] Test independently with API key

**File:** `lib/swapPayload.js`
- [ ] Create file with payload utilities
- [ ] Implement `findToken(tokensPayload, tokenId)` - Find token by ID
- [ ] Implement `toBaseUnits(amountStr, decimals)` - Convert decimal to base units
- [ ] Implement `baseUnitsToDecimal(amountBase, decimals)` - Convert from base units
- [ ] Implement `buildQuotePayload(body, options)` - Build 1Click API payload
- [ ] Implement `quoteObj(resp)` - Extract quote object from response
- [ ] Implement `extractDepositFields(resp)` - Extract deposit address/memo
- [ ] Add validation for required fields
- [ ] Test conversion functions with various decimals

#### 1.2 Create API Routes

**File:** `app/api/swap/tokens/route.js`
- [ ] Create route directory structure
- [ ] Implement GET handler
- [ ] Call `oneclickTokens()` from library
- [ ] Normalize token response: `{id, symbol, label, logo, decimals, chain}`
- [ ] Implement 5-minute caching (300 seconds)
- [ ] Return error responses with retryable flags
- [ ] Test endpoint: `GET /api/swap/tokens`

**File:** `app/api/swap/quote/route.js`
- [ ] Create route file
- [ ] Implement POST handler
- [ ] Validate request body: `{fromToken, toToken, amountIn, destAddress, refundAddress, slippageTolerance}`
- [ ] Build payload using `buildQuotePayload()` with `dry: true`
- [ ] Call `oneclickQuote()` from library
- [ ] Normalize response with `quoteObj()` helper
- [ ] Return display-friendly format: `{fromSymbol, toSymbol, amountInFormatted, amountOutFormatted, amountInUsd, amountOutUsd, timeEstimate}`
- [ ] Test endpoint: `POST /api/swap/quote`

**File:** `app/api/swap/confirm/route.js`
- [ ] Create route file
- [ ] Implement POST handler
- [ ] Validate request body (same as quote)
- [ ] Build payload using `buildQuotePayload()` with `dry: false`
- [ ] Call `oneclickQuote()` from library (creates actual swap)
- [ ] Extract deposit fields using `extractDepositFields()`
- [ ] Build payment URI:
  - Bitcoin: `bitcoin:address?amount=X`
  - Other chains: address-only
- [ ] Convert base units to decimal using `baseUnitsToDecimal()`
- [ ] Validate BTC addresses for BTC swaps
- [ ] Return: `{swapId, deposit, paymentUri, statusKey, display}`
- [ ] Test endpoint: `POST /api/swap/confirm`

**File:** `app/api/swap/status/route.js`
- [ ] Create route file
- [ ] Implement GET handler
- [ ] Extract query params: `depositAddress` (required), `depositMemo` (optional)
- [ ] Call `oneclickStatus()` with deposit address
- [ ] Return status: `{status: "PENDING"|"SUCCESS"|"FAILED"|"REFUNDED", data}`
- [ ] Handle retryable errors gracefully
- [ ] Test endpoint: `GET /api/swap/status?depositAddress=...`

#### 1.3 Update Existing Routes

**File:** `app/api/rates/route.js`
- [ ] Reduce cache revalidation from 60s to 10s
- [ ] Change `next: { revalidate: 60 }` to `next: { revalidate: 10 }`
- [ ] Update `Cache-Control` header: `s-maxage=10`
- [ ] Add support for `asset` query parameter (optional, defaults to "ZEC")
- [ ] Update API calls to fetch rates for the specified asset
- [ ] Test rate endpoint still works with existing calls
- [ ] Test rate endpoint with `?fiat=USD&asset=BTC` parameter

#### 1.4 Phase 1 Testing
- [ ] Test all 4 swap API endpoints independently
- [ ] Verify error handling works correctly
- [ ] Test with invalid inputs
- [ ] Verify caching works for tokens endpoint
- [ ] Test timeout handling
- [ ] Test rates endpoint with asset parameter

---

### Phase 2: Frontend State Management
**Goal:** Add swap state management to MemoComposer  
**Estimated Time:** 3-4 hours  
**Dependencies:** Phase 1 complete

#### 2.1 Update MemoComposer Component

**File:** `ui/messaging/MemoComposer.jsx`

**Add State Variables:**
- [ ] Add `tokenOptions` state (array of tokens)
- [ ] Add `originTokenId` state (selected source token)
- [ ] Add `zecTokenId` state (ZEC token ID, always destination)
- [ ] Add `originSymbol` state (display symbol, default "ZEC")
- [ ] Add `refundAddress` state (user's refund address)
- [ ] Add `slippageTolerance` state (default "0.5")
- [ ] Add `quoteData` state (quote response)
- [ ] Add `quoteStatus` state (UI status messages)
- [ ] Add `depositUri` state (payment URI for QR code)
- [ ] Add `statusKey` state (`{depositAddress, depositMemo}`)
- [ ] Add `swapStatus` state (current swap status)
- [ ] Add `isQuoting` state (loading flag)
- [ ] Add `isConfirming` state (loading flag)

**Add Mode Detection:**
- [ ] Add `isZecMode` computed: `originTokenId === zecTokenId`
- [ ] Add `isSwapMode` computed: `originTokenId !== zecTokenId`

**Add Functions:**
- [ ] Implement `loadTokens()` - Fetch from `/api/swap/tokens`
  - Call on component mount
  - Set `tokenOptions` and find ZEC token ID
  - Handle errors gracefully
- [ ] Implement `handleGetQuote()` - POST to `/api/swap/quote` (optional preview)
  - Set loading state
  - Validate required fields (use `profile?.address` for destAddress)
  - Handle errors
- [ ] Implement `handleConfirmQuote()` - POST to `/api/swap/confirm` (manual confirm)
  - Set loading state
  - Validate required fields (use `profile?.address` for destAddress)
  - Extract deposit URI and status key
  - Start status polling
- [ ] **Implement `handleAutoConfirm()` - Auto-confirm on changes (debounced ~800ms)** ⚠️ REQUIRED
  - Use `useEffect` with debounce (use `useDebounce` from `use-debounce` package)
  - Trigger on: `amount`, `originTokenId`, `profile?.address`, `refundAddress` changes
  - Only trigger if all required fields present
  - Only trigger in swap mode
  - Call `/api/swap/confirm` directly (creates swap)
- [ ] Implement `pollSwapStatus()` - GET `/api/swap/status` every 6s
  - Use `useEffect` with interval
  - Stop on terminal states: `SUCCESS`, `FAILED`, `REFUNDED`
  - Handle retryable errors
- [ ] Implement `cancelSwapToZec()` - Cancel swap mode, return to ZEC
  - Reset swap-related state
  - Set `originTokenId` to `zecTokenId`

**Add Debounce Hook:**
- [ ] Import `useDebounce` from `use-debounce` package (already installed)
- [ ] Use for `handleAutoConfirm` to avoid excessive API calls

**Note:** Component receives `profile` prop, so use `profile?.address` instead of `selectedAddress` from context.

#### 2.2 Phase 2 Testing
- [ ] Test token loading on mount
- [ ] Test mode switching (ZEC ↔ Swap)
- [ ] Test auto-confirm triggers correctly (debounced)
- [ ] Test debouncing works (doesn't call API too frequently)
- [ ] Test status polling starts and stops correctly

---

### Phase 3: UI Components - Token Selector
**Goal:** Add token selector dropdown to AmountAndWallet  
**Estimated Time:** 4-5 hours  
**Dependencies:** Phase 2 complete

#### 3.1 Update AmountAndWallet Component

**File:** `ui/verification/AmountAndWallet.jsx`

**Add Props:**
- [ ] Add `asset` prop (current selected symbol, default "ZEC")
- [ ] Add `assetOptions` prop (array of token options)
- [ ] Add `setAsset` prop (callback when token selected)
- [ ] Add `showRefund` prop (boolean, show refund field)
- [ ] Add `refundAddress` prop
- [ ] Add `setRefundAddress` prop
- [ ] Make all new props optional for backward compatibility

**Replace Token Display:**
- [ ] Replace hardcoded "ZEC ▼" (line 183) with dynamic token selector
- [ ] Show current `asset` symbol
- [ ] Make it clickable/dropdown
- [ ] Update styling to match current design system (gray-800, blue-600)

**Add Token Selector Dropdown:**
- [ ] Create searchable dropdown component
- [ ] Display token logos when available
- [ ] Show token symbol and label (e.g., "BTC - Bitcoin (mainnet)")
- [ ] Add keyboard navigation (arrow keys, enter, escape)
- [ ] Prefer "mainnet" tokens when multiple chains available
- [ ] Group tokens by symbol, show best chain option
- [ ] Call `setAsset(tokenId)` on selection
- [ ] Style to match existing design system (light theme)

**Add Refund Address Input:**
- [ ] Conditionally render when `showRefund` is true
- [ ] Add input field below amount input
- [ ] Dynamic label based on source token (e.g., "BTC Refund Address")
- [ ] Use `refundAddress` and `setRefundAddress` props
- [ ] Add validation (format check for BTC addresses when BTC selected)
- [ ] Style to match existing input fields (border-gray-800, etc.)

**Update Rate Fetching:**
- [ ] Modify `fetchRate` to accept asset parameter
- [ ] Update API call: `/api/rates?fiat=${fiat}&asset=${asset || "ZEC"}`
- [ ] Update rate display to show rate for selected asset (not just ZEC)
- [ ] Handle case when asset is not ZEC (may need different API endpoint logic)

#### 3.2 Update MemoComposer to Pass Props

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Pass `asset={originSymbol}` to AmountAndWallet
- [ ] Pass `assetOptions={tokenOptions}` to AmountAndWallet
- [ ] Pass `setAsset={(tokenId) => setOriginTokenId(tokenId)}` to AmountAndWallet
- [ ] Pass `showRefund={isSwapMode}` to AmountAndWallet
- [ ] Pass `refundAddress={refundAddress}` to AmountAndWallet
- [ ] Pass `setRefundAddress={setRefundAddress}` to AmountAndWallet

#### 3.3 Phase 3 Testing
- [ ] Test token selector dropdown opens/closes
- [ ] Test token selection updates state
- [ ] Test search functionality
- [ ] Test keyboard navigation
- [ ] Test refund address input appears/disappears correctly
- [ ] Test refund address validation
- [ ] Test rate fetching for different assets

---

### Phase 4: UI Components - Swap Controls & Display
**Goal:** Add slippage controls, quote display, and swap status  
**Estimated Time:** 3-4 hours  
**Dependencies:** Phase 3 complete

#### 4.1 Add Slippage Controls

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Create slippage control component/section
- [ ] Add preset buttons: 0.1%, 0.5%, 1%, 2%, 5%
- [ ] Add custom input field
- [ ] Validate slippage (0-10000 basis points)
- [ ] Show only in swap mode
- [ ] Style to match existing design (light theme: gray-800, blue-600)

#### 4.2 Add Quote Display (Optional Preview)

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Create quote display card component
- [ ] Show side-by-side comparison (From → To)
- [ ] Display amounts in both tokens and USD
- [ ] Show estimated time
- [ ] Show slippage tolerance
- [ ] Only display when `quoteData` exists
- [ ] Style to match existing design (light theme)

#### 4.3 Add Manual Quote/Confirm Buttons (Optional)

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Add "Get Quote" button (optional, for preview)
- [ ] Add "Confirm Quote" button (optional, for manual confirm)
- [ ] Show only in swap mode
- [ ] Disable during loading states
- [ ] Style to match existing buttons (border-gray-800, hover:border-blue-500)

#### 4.4 Add Swap Status Indicator

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Create status indicator component
- [ ] Display current `swapStatus`
- [ ] Color-code status messages:
  - PENDING: yellow/orange
  - SUCCESS: green
  - FAILED: red
  - REFUNDED: blue
- [ ] Show loading spinner during polling
- [ ] Show error messages with retry guidance
- [ ] Position appropriately in UI

#### 4.5 Phase 4 Testing
- [ ] Test slippage preset buttons
- [ ] Test custom slippage input
- [ ] Test quote display shows correct data
- [ ] Test manual quote/confirm buttons (if implemented)
- [ ] Test status indicator updates correctly
- [ ] Test status colors match states

---

### Phase 5: QR Code & Payment URI Integration
**Goal:** Update QR code to show deposit URI and recipient address  
**Estimated Time:** 2-3 hours  
**Dependencies:** Phase 4 complete

#### 5.1 Update QR Code Display

**File:** `ui/messaging/MemoComposer.jsx`

**Update QrUriBlock Usage:**
- [ ] Determine which URI to display:
  - Swap mode: Use `depositUri` (from confirm response)
  - ZEC mode: Use existing `uri` (from `useFeedbackController()`)
- [ ] Pass correct URI to `QrUriBlock` component
- [ ] Fallback to deposit address if URI unavailable

**Note:** `QrUriBlock` is imported from `@/ui/verification/QrUriBlock`

#### 5.2 Add Recipient ZEC Address Display ⚠️ REQUIRED

**File:** `ui/messaging/MemoComposer.jsx`

**Add Below QR Code:**
- [ ] Create recipient address display section
- [ ] Show label: "Recipient will receive ZEC at:" or similar
- [ ] Display `profile?.address` (recipient's shielded ZEC u-address)
- [ ] Add copy button next to address (use existing `CopyButton` component from `@/ui/profile/CopyButton`)
- [ ] Show only when in swap mode (or always visible for clarity)
- [ ] Style to match existing design (light theme)
- [ ] Make it clear this is where ZEC will be delivered after swap

**Implementation Example:**
```jsx
{isSwapMode && depositUri && (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="text-xs text-gray-600 mb-2 font-medium">
      Recipient will receive ZEC at:
    </div>
    <div className="flex items-center gap-2">
      <code className="text-sm font-mono flex-1 break-all text-gray-800">
        {profile?.address}
      </code>
      <CopyButton text={profile?.address} />
    </div>
  </div>
)}
```

#### 5.3 Update Memo Field Behavior

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Disable memo field when `isSwapMode` is true
- [ ] Update placeholder text: "Memos are not supported for cross-chain swaps"
- [ ] Show explanation tooltip/message if needed
- [ ] Update disabled styling to match current design

#### 5.4 Phase 5 Testing
- [ ] Test QR code shows deposit URI in swap mode
- [ ] Test QR code shows Zcash URI in ZEC mode
- [ ] Test recipient address displays correctly
- [ ] Test copy button works
- [ ] Test memo field disabled in swap mode
- [ ] Test QR code updates when switching modes

---

### Phase 6: Integration & Polish
**Goal:** Final integration, error handling, edge cases  
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous phases complete

#### 6.1 Error Handling

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Add comprehensive error handling for all API calls
- [ ] Display user-friendly error messages
- [ ] Handle network errors gracefully
- [ ] Handle API errors with retryable flags
- [ ] Show loading states during async operations
- [ ] Handle edge cases:
  - Token list empty or fails to load
  - Quote fails (network error, invalid params)
  - Confirm fails after successful quote
  - Status polling timeout or errors
  - User cancels swap mid-flow
  - Multiple rapid quote requests
  - Auto-confirm fails (invalid refund address, etc.)

#### 6.2 Validation

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Validate amount > 0 before API calls
- [ ] Validate refund address format (especially BTC)
- [ ] Validate slippage tolerance bounds (0-10000 basis points)
- [ ] Validate required fields before confirm
- [ ] Show validation errors in UI

#### 6.3 UX Improvements

**File:** `ui/messaging/MemoComposer.jsx`

- [ ] Add loading spinners for async operations
- [ ] Add success/error notifications
- [ ] Improve status messages clarity
- [ ] Add helpful tooltips/explanations
- [ ] Ensure smooth transitions between modes
- [ ] Test on mobile devices

#### 6.4 Code Cleanup

- [ ] Remove console.log statements
- [ ] Add JSDoc comments to functions
- [ ] Ensure consistent code style
- [ ] Remove unused imports
- [ ] Optimize re-renders if needed

#### 6.5 Phase 6 Testing
- [ ] Test all error scenarios
- [ ] Test validation works correctly
- [ ] Test edge cases
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Test complete swap flow end-to-end

---

## Testing Strategy

### Unit Tests (Optional but Recommended)
- [ ] Test payload building functions
- [ ] Test amount conversion utilities
- [ ] Test token normalization
- [ ] Test payment URI generation

### Integration Tests
- [ ] Test token loading flow
- [ ] Test quote → confirm → status flow
- [ ] Test error scenarios
- [ ] Test mode switching
- [ ] Test auto-confirm debouncing

### Manual Testing Checklist
- [ ] Load tokens successfully
- [ ] Select different tokens (BTC, ETH, etc.)
- [ ] Enter amount and refund address
- [ ] Verify auto-confirm triggers on changes (debounced)
- [ ] Verify quote updates automatically
- [ ] See deposit address and QR code
- [ ] See recipient ZEC address (below QR with copy button)
- [ ] Poll status until completion
- [ ] Switch between ZEC and swap modes
- [ ] Test memo field disabled in swap mode
- [ ] Test refund address validation
- [ ] Test slippage controls
- [ ] Test error handling
- [ ] Test on mobile devices

---

## File Summary

### Files to Create (6 files)
1. `lib/oneClick.js` - 1Click API client
2. `lib/swapPayload.js` - Payload utilities
3. `app/api/swap/tokens/route.js` - Token list endpoint
4. `app/api/swap/quote/route.js` - Quote endpoint
5. `app/api/swap/confirm/route.js` - Confirm endpoint
6. `app/api/swap/status/route.js` - Status endpoint

### Files to Modify (3 files)
1. `ui/messaging/MemoComposer.jsx` - Add swap integration (main component)
2. `ui/verification/AmountAndWallet.jsx` - Add token selector + refund field
3. `app/api/rates/route.js` - Reduce cache time (60s → 10s) + add asset parameter support

---

## Dependencies & Considerations

### External Dependencies
- **1Click API**: Requires API key and account setup
- **qrcode.react**: Already in use (for QR codes)
- **use-debounce**: Already installed (`use-debounce` package)
- **React hooks**: useState, useEffect, useMemo, useRef (already available)

### Security Considerations
- ✅ API key never exposed to client (server-side only)
- ✅ Refund address user-provided, validated format
- ✅ Amount validation server-side
- ✅ Slippage limits bounded
- ✅ Timeout handling prevents hanging requests
- ✅ Error messages don't leak sensitive API details

### Performance Considerations
- Token list cached for 5 minutes
- Debounced auto-confirm (800ms) prevents excessive API calls
- Status polling every 6 seconds (reasonable interval)
- Rate API cache reduced to 10s for accuracy

---

## Rollout Strategy

### Step 1: Backend First
- Implement and test all API routes independently
- Verify with 1Click API directly
- Ensure error handling works

### Step 2: Frontend Integration
- Add state management first
- Then add UI components incrementally
- Test each component as you build

### Step 3: End-to-End Testing
- Test complete swap flow
- Test error scenarios
- Test edge cases
- Verify auto-confirm works correctly

### Step 4: Code Review
- Review all changes
- Ensure code quality
- Check security considerations

### Step 5: Merge to dev/jules
- Create feature branch from dev/jules
- Implement changes
- Test thoroughly
- Create PR for review
- Merge after approval

---

## Success Criteria

✅ All API endpoints work correctly  
✅ Token selector loads and displays tokens  
✅ Quote fetching works (auto and manual)  
✅ Auto-confirm triggers on changes (debounced)  
✅ Swap confirmation creates swap  
✅ Status polling works until completion  
✅ QR code displays deposit URI correctly  
✅ **Recipient ZEC address displays correctly (below QR with copy button)**  
✅ Memo field disabled in swap mode  
✅ Error handling works gracefully  
✅ Mode switching works smoothly  
✅ Mobile responsive  
✅ No console errors  
✅ Code follows project conventions  

---

## Notes & Reminders

- **Important**: Always keep API key server-side only
- **Important**: Show recipient ZEC address below QR code (required feature)
- **Important**: Memos only work with ZEC, disable in swap mode
- **Important**: Auto-confirm on changes is REQUIRED (debounced ~800ms)
- **Remember**: Debounce auto-confirm to avoid excessive API calls
- **Remember**: Status polling should stop on terminal states
- **Remember**: Test with real API key before merging
- **Remember**: Handle all error cases gracefully
- **Remember**: Component uses `profile` prop, not context for address
- **Remember**: Use light theme styling (gray-800, blue-600, etc.)

---

## Questions to Resolve During Implementation

1. Should we show manual "Get Quote" and "Confirm Quote" buttons, or rely entirely on auto-confirm?
   - **Recommendation**: Start with auto-confirm, add manual buttons if needed for user control

2. How should we handle tokens with same symbol on multiple chains?
   - **Answer**: Prefer "mainnet" chains, group by symbol, show best option

3. Should recipient ZEC address always be visible, or only in swap mode?
   - **Recommendation**: Always visible for clarity, but especially important in swap mode

4. What happens if user switches tokens mid-flow?
   - **Answer**: Cancel current swap, reset state, start new flow

5. Should we persist swap state across page refreshes?
   - **Recommendation**: No, keep stateless (use deposit address for polling)

6. What happens if auto-confirm fails (e.g., invalid refund address)?
   - **Answer**: Show error message, allow user to fix, then retry on next change

---

## Estimated Timeline

- **Phase 1 (Backend)**: 4-6 hours
- **Phase 2 (State Management)**: 3-4 hours
- **Phase 3 (Token Selector)**: 4-5 hours
- **Phase 4 (Swap Controls)**: 3-4 hours
- **Phase 5 (QR & Address)**: 2-3 hours
- **Phase 6 (Integration)**: 3-4 hours

**Total Estimated Time**: 19-26 hours

**With Testing & Polish**: 25-30 hours

---

## Next Steps

1. ✅ Review this implementation plan
2. ⬜ Set up 1Click API account and get API key
3. ⬜ Add environment variables
4. ⬜ Start with Phase 1 (Backend Infrastructure)
5. ⬜ Test each phase before moving to next
6. ⬜ Create feature branch from dev/jules
7. ⬜ Implement following this plan
8. ⬜ Test thoroughly (especially auto-confirm and recipient address display)
9. ⬜ Create PR for review
10. ⬜ Merge to dev/jules

---

*Last Updated: 2026-02-05*  
*Plan Version: 3.0 - Combined Feature Documentation, User Story, and Implementation Guide*  
*Component Structure: Refactored to `ui/` directory (MemoComposer, AmountAndWallet)*  
*Key Requirements: Auto-confirm on changes (debounced), Recipient ZEC address display*
