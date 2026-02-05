# API Routes Verification Report

**Date:** 2026-02-05  
**Status:** ✅ Verified and Fixed

---

## Summary

Verified all swap-related API routes and their usage in the frontend. Fixed one issue with status parsing and confirmed all request/response structures match expectations.

---

## API Routes Verified

### 1. `/api/swap/tokens` (GET)

**Route:** `app/api/swap/tokens/route.js`

**Response Structure:**
```json
{
  "ok": true,
  "data": { /* raw response from oneclickTokens() */ }
}
```

**Frontend Usage:** `ui/messaging/MemoComposer.jsx:64-74`
- ✅ Correctly handles `result.data?.tokens || result.data || []`
- ✅ Handles both array and object response structures
- ✅ Proper error handling with `result.ok` check

**Issues Found:** None

---

### 2. `/api/swap/confirm` (POST)

**Route:** `app/api/swap/confirm/route.js`

**Request Body (from frontend):**
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

**Response Structure:**
```json
{
  "ok": true,
  "swapId": "uuid",
  "deposit": {
    "address": "bc1...",
    "memo": null,
    "mode": "...",
    "amountBaseUnits": "100000",
    "amountDecimal": "0.001",
    "originAsset": "token-id",
    "decimals": 8
  },
  "paymentUri": "bitcoin:bc1...?amount=0.001",
  "statusKey": {
    "depositAddress": "bc1...",
    "depositMemo": null
  },
  "display": {
    "amountInFormatted": "0.001",
    "amountOutFormatted": "0.045",
    "timeEstimateSec": 300
  }
}
```

**Frontend Usage:** `ui/messaging/MemoComposer.jsx:205-234`
- ✅ Correctly extracts `result.paymentUri`
- ✅ Correctly extracts `result.deposit?.address`
- ✅ Correctly extracts `result.statusKey`
- ✅ Proper error handling

**Issues Found:** None

---

### 3. `/api/swap/status` (GET)

**Route:** `app/api/swap/status/route.js`

**Query Parameters:**
- `depositAddress` (required)
- `depositMemo` (optional)

**Response Structure:**
```json
{
  "ok": true,
  "status": { /* raw response from oneclickStatus() */ }
}
```

**Expected Status Structure (from API):**
The raw `oneclickStatus()` response may have different structures:
- `{ status: "PENDING" }` (direct)
- `{ status: { status: "PENDING", data: {...} } }` (nested)

**Frontend Usage:** `ui/messaging/MemoComposer.jsx:157-189`

**Issues Found & Fixed:**
- ❌ **Original Issue:** Assumed `result.status.status` always exists
- ✅ **Fixed:** Added robust parsing to handle both direct and nested structures:
  ```javascript
  const status = result.status?.status || result.status || null;
  ```
- ✅ Added case-insensitive status matching (`status.toUpperCase()`)
- ✅ Added error handling for non-retryable errors
- ✅ Improved logging for debugging

---

### 4. `/api/swap/quote` (POST)

**Route:** `app/api/swap/quote/route.js`

**Note:** This endpoint exists but is not currently used by `MemoComposer`. It's available for future quote-only functionality.

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

**Response Structure:**
```json
{
  "ok": true,
  "quoteId": "quote-123",
  "quote": { /* raw quote */ },
  "display": {
    "fromSymbol": "BTC",
    "toSymbol": "ZEC",
    "amountInFormatted": "0.001",
    "amountOutFormatted": "0.045",
    "amountInUsd": 65.50,
    "amountOutUsd": 2.95,
    "timeEstimate": "5-10 minutes",
    "minAmountOut": "0.044"
  },
  "requestDebug": { /* debug info */ }
}
```

**Issues Found:** None (not currently used)

---

## Request/Response Validation

### ✅ All Endpoints Match Expectations

1. **Tokens Endpoint:**
   - Frontend correctly handles `result.data` structure
   - Properly extracts tokens array from various response formats

2. **Confirm Endpoint:**
   - Request body matches `buildQuotePayload()` expectations
   - All required fields present: `fromToken`, `toToken`, `amountIn`, `destAddress`, `refundAddress`
   - Response structure matches frontend expectations

3. **Status Endpoint:**
   - Query parameters correctly formatted
   - Response parsing now handles multiple structures
   - Error handling improved

---

## Error Handling

### Current Error Handling:

1. **Tokens API:**
   - ✅ Checks `response.ok`
   - ✅ Checks `result.ok`
   - ✅ Catches and logs errors
   - ✅ Falls back to default ZEC mode on error

2. **Confirm API:**
   - ✅ Checks `result.ok`
   - ✅ Throws errors with messages
   - ✅ Sets error state in UI
   - ✅ Handles missing fields gracefully

3. **Status API:**
   - ✅ Checks `result.ok`
   - ✅ Handles missing status gracefully
   - ✅ Distinguishes retryable vs non-retryable errors
   - ✅ Stops polling on terminal states

---

## Recommendations

### ✅ Completed Fixes:
1. Fixed status parsing to handle multiple response structures
2. Added case-insensitive status matching
3. Improved error handling for status polling

### 🔍 Future Improvements (Optional):
1. Add response type definitions/TypeScript interfaces
2. Add request/response validation middleware
3. Add retry logic for retryable errors
4. Add request timeout handling in frontend
5. Consider using the `/api/swap/quote` endpoint for preview before confirm

---

## Testing Checklist

- [x] Tokens API returns expected structure
- [x] Confirm API accepts correct request format
- [x] Confirm API returns expected response format
- [x] Status API handles different response structures
- [x] Error handling works correctly
- [x] Frontend correctly parses all responses

---

## Conclusion

All API routes are properly implemented and match frontend expectations. The status parsing issue has been fixed to handle multiple response structures robustly. The swap feature should now work correctly end-to-end.
