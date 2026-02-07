# Testing Guide: 1Click Swap Integration (ANY Token → ZEC)

## Overview

This guide helps you test the 1Click API integration for swapping any supported token to Zcash (ZEC) on zcash.me.

**Supported Source Tokens:** BTC, ETH, USDC, USDT, SOL
**Destination Token:** ZEC (Zcash)

## Architecture Quick Reference

### Key Files
- **API Client:** `/lib/swap/oneClick.js` - 1Click API integration
- **State Management:** `/app/[slug]/providers/swap-provider.jsx` - SwapContext
- **UI Components:**
  - `/ui/swap/SwapComposer.jsx` - Quote form
  - `/ui/swap/SwapDepositDisplay.jsx` - Deposit instructions with "I've Sent Funds" button
- **Status Page:** `/app/swap/page.jsx` - Public swap tracking page
- **API Endpoint:** `/app/api/swap/status/route.js` - Status polling proxy

### Data Flow
```
1. User selects tokens & amount → SwapComposer
2. Request quote (dry: true) → Display preview
3. User confirms → Request quote (dry: false) → Get deposit address
4. Display QR code & deposit instructions → SwapDepositDisplay
5. User clicks "I've Sent Funds" → Navigate to /swap status page
6. Adaptive polling monitors swap progress
   - Fast: 1s intervals (first 5 polls)
   - Slow: 5s intervals (after 5 polls)
   - Timeout: 5 minutes
   - Retries: 3 per failed poll
```

---

## Phase 1: Environment & API Testing

### 1.1 Verify Environment Setup

```bash
# Check API key is configured
grep ONECLICK_API_KEY .env

# Should output something like:
# ONECLICK_API_KEY=your_key_here
```

✅ **Expected:** API key is present in `.env` file

### 1.2 Run API Integration Test

```bash
# From project root
node /tmp/claude/.../scratchpad/test-oneclick-integration.js
```

This script will test:
1. ✅ Token fetching (`/v0/tokens`)
2. ✅ Dry quote generation (`/v0/quote` with `dry: true`)
3. ✅ Real quote with deposit address (`dry: false`)
4. ✅ Status checking (`/v0/status`)

**What to verify:**
- [ ] All 4 tests pass
- [ ] ZEC token is found in supported tokens
- [ ] Source tokens (BTC, ETH, etc.) are available
- [ ] Quote returns valid amounts and deposit address
- [ ] Status check returns `PENDING_DEPOSIT`

**⚠️ Important:** The script generates a real deposit address but DO NOT send funds to it unless intentional.

---

## Phase 2: UI Flow Testing (Manual)

### 2.1 Start Development Server

```bash
npm run dev
# or
yarn dev
```

### 2.2 Test Quote Generation

1. **Navigate to swap page** (likely at `/` or `/swap` depending on your routes)

2. **Select tokens:**
   - From: Choose any token (e.g., BTC, ETH, USDC)
   - To: Should be ZEC (or select ZEC if multiple options)

3. **Enter amount:**
   - Try small amount first (e.g., 0.001 BTC)
   - Watch for USD conversion display

4. **Enter addresses:**
   - Refund address: Valid address for source token chain
   - Destination address: Valid ZEC address (t-address or z-address)

5. **Select slippage tolerance:**
   - Try different values: 0.1%, 0.5%, 1%, 2%, 5%
   - Default should be 0.5% (50 basis points)

6. **Click "Get Quote" button**

**What to verify:**
- [ ] Quote appears with estimated receive amount
- [ ] Min amount out is displayed (accounting for slippage)
- [ ] Time estimate shows (e.g., "~2-5 minutes")
- [ ] USD values display correctly
- [ ] No errors in browser console

**Common Issues:**
- Quote fails → Check refund/dest addresses are valid
- "Amount too low" → Increase amount
- API timeout → Check network connection

---

### 2.3 Test Deposit Address Generation

1. **Click "Confirm Swap" button** (after getting quote)

**What to verify:**
- [ ] Deposit address is generated
- [ ] QR code displays correctly
- [ ] Exact amount to send is shown
- [ ] If memo/tag required, warning is displayed (for XRP, XLM, EOS, BNB)
- [ ] Copy address button works
- [ ] "I've Sent Funds" button is visible and clickable

**Check in code:**
File: `/ui/swap/SwapDepositDisplay.jsx:170`
```javascript
<button onClick={handleSentFunds}>
  I've Sent Funds
</button>
```

**Test QR Code:**
- [ ] QR code scans correctly with wallet app
- [ ] Contains correct address (and memo if applicable)
- [ ] "Save QR" button downloads SVG

---

### 2.4 Test "I've Sent Funds" Navigation

1. **Click "I've Sent Funds" button**

**What to verify:**
- [ ] Navigates to `/swap?depositAddress=...`
- [ ] Status page loads with swap details
- [ ] Shows correct token pair (e.g., BTC → ZEC)
- [ ] Status is "Pending Deposit" or "Awaiting funds..."
- [ ] Polling indicator shows (animated dots)

**URL Format:**
```
/swap?depositAddress=3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy
```

---

### 2.5 Test Status Polling (Without Sending Funds)

**What to verify:**
- [ ] Status polls every 1 second initially (check Network tab)
- [ ] No JavaScript errors in console
- [ ] Status stays "PENDING_DEPOSIT" (since no funds sent)
- [ ] Polling continues for ~5 minutes or until stopped
- [ ] After 5 polls, interval increases to 5 seconds (backoff)

**Check Network Activity:**
1. Open browser DevTools → Network tab
2. Filter by `swap/status` or `v0/status`
3. Watch polling frequency:
   - First 5 requests: ~1 second apart
   - After 5: ~5 seconds apart

**Code Reference:**
File: `/app/[slug]/providers/swap-provider.jsx`
- Aggressive polling: 1s (first 5 polls)
- Backoff polling: 5s (after 5 polls)
- Max retries: 3 per failed request
- Timeout: 5 minutes total

---

### 2.6 Test Manual Status Entry

1. **Navigate to `/swap` without query params**
2. **Enter deposit address manually** (from earlier test)
3. **Add memo if applicable**
4. **Click "Check Status" or submit**

**What to verify:**
- [ ] Status lookup works
- [ ] Shows "PENDING_DEPOSIT" for unfunded address
- [ ] Displays correct token pair

---

## Phase 3: Error Handling Tests

### 3.1 Invalid Inputs

Test these scenarios in the UI:

| Test Case | Expected Behavior |
|-----------|-------------------|
| Empty amount | Error: "Amount required" or button disabled |
| Zero amount | Error: "Amount must be greater than 0" |
| Invalid refund address | Error on quote request |
| Invalid destination address | Error on quote request |
| Missing addresses | Form validation prevents submit |

### 3.2 Network Errors

Simulate network issues:

```javascript
// In DevTools Console, override fetch temporarily:
const originalFetch = window.fetch;
window.fetch = (...args) => {
  if (args[0].includes('1click')) {
    return Promise.reject(new Error('Network error'));
  }
  return originalFetch(...args);
};

// Test quote request → should show user-friendly error
// Restore: window.fetch = originalFetch;
```

**What to verify:**
- [ ] Network errors show user-friendly messages
- [ ] No technical error details exposed to user
- [ ] User can retry after error

### 3.3 API Errors

Test API error responses:

| Status Code | Scenario | Expected Handling |
|-------------|----------|-------------------|
| 401 | Invalid API key | Error: "API authentication failed" |
| 404 | Deposit not found | Status: "PENDING_DEPOSIT" (handled gracefully) |
| 400 | Invalid quote params | Error message from API displayed |
| 500 | Server error | Error: "Service temporarily unavailable" |

**Code Reference:**
File: `/lib/swap/oneClick.js:77-89`
Error extraction logic tries to parse API error messages.

---

## Phase 4: Real Swap Testing (With Friend)

⚠️ **Only proceed after all above tests pass!**

### 4.1 Small Test Swap

**Recommended first swap:**
- Amount: 0.0001 BTC → ZEC (or equivalent small amount)
- Why: Minimizes risk, tests full flow

### 4.2 Swap Execution Checklist

1. **Pre-swap:**
   - [ ] Get quote in UI
   - [ ] Verify amounts are acceptable
   - [ ] Note min amount out (worst case)
   - [ ] Screenshot deposit details

2. **During swap:**
   - [ ] Send exact amount to deposit address
   - [ ] Include memo/tag if required
   - [ ] Click "I've Sent Funds"
   - [ ] Monitor status page
   - [ ] Watch polling in Network tab

3. **Expected status progression:**
   ```
   PENDING_DEPOSIT (before funds sent)
     ↓ (deposit detected)
   PROCESSING (swap in progress)
     ↓ (swap completed)
   SUCCESS (funds delivered to ZEC address)
   ```

4. **Verify success:**
   - [ ] Status shows "SUCCESS"
   - [ ] Check ZEC wallet for received funds
   - [ ] Amount matches min amount out (or better)
   - [ ] Transaction hash displayed (if available)

### 4.3 Edge Cases to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Send less than quote amount | `INCOMPLETE_DEPOSIT` → Auto refund |
| Send more than quote amount | Excess may be refunded or included |
| Swap takes longer than expected | Polling continues, status updates |
| Network congestion | Longer PROCESSING time, eventual SUCCESS |
| Market price moves significantly | May get less than quote (within slippage) |

### 4.4 Monitoring During Real Swap

**What to watch:**

1. **Browser Console:**
   - No JavaScript errors
   - Polling requests succeed

2. **Network Tab:**
   - `/api/swap/status` polls every 1-5 seconds
   - All return 200 OK (or 404 before deposit)

3. **Status Page:**
   - Status badge updates: PENDING → PROCESSING → SUCCESS
   - Amount sent/received displays correctly
   - Transaction details expand correctly

4. **Blockchain Explorers:**
   - Confirm source transaction (e.g., BTC explorer)
   - Confirm ZEC receipt (e.g., zcashblockexplorer.com)

---

## Phase 5: Failure Scenarios

### 5.1 Test Refund Flow

If you have a failed/incomplete swap:

**What to verify:**
- [ ] Status shows "REFUNDED" or "INCOMPLETE_DEPOSIT"
- [ ] Funds return to refund address
- [ ] Status page shows refund details

### 5.2 Swap Timeout

If swap doesn't complete within 20 minutes (deadline):

**What to verify:**
- [ ] Status eventually shows "FAILED" or "REFUNDED"
- [ ] UI doesn't hang or crash
- [ ] User can initiate new swap

---

## Debugging Tips

### Check Logs

```bash
# View Next.js server logs
# Watch for API errors or timeout messages
```

### Inspect State

In browser console:
```javascript
// Access React DevTools
// Find SwapContext → Check state values:
// - tokens
// - quote
// - depositInfo
// - statusPolling
```

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "API key not configured" | Missing ONECLICK_API_KEY | Add to .env and restart |
| Quote returns null amounts | Invalid token pair | Check token IDs match API |
| Polling stops prematurely | Timeout or max retries hit | Check network, increase timeout |
| QR code doesn't scan | Invalid payment URI format | Check address/memo formatting |
| Status stuck on PENDING | Deposit not detected | Verify transaction confirmed on-chain |

### Enable Verbose Logging

Add to your code temporarily:
```javascript
// In swap-provider.jsx, add console logs:
console.log('Quote response:', quote);
console.log('Status response:', status);
console.log('Polling attempt:', attemptCount);
```

---

## Checklist Summary

Before real swap with friend:

### API Level
- [ ] All 4 API tests pass (tokens, dry quote, real quote, status)
- [ ] ZEC token is available
- [ ] Source tokens (BTC, ETH, etc.) are available

### UI Level
- [ ] Quote generation works
- [ ] Deposit address generation works
- [ ] QR codes display correctly
- [ ] "I've Sent Funds" button navigates to status page
- [ ] Status polling works (check Network tab)
- [ ] Manual status entry works

### Error Handling
- [ ] Invalid inputs show errors
- [ ] Network errors handled gracefully
- [ ] API errors display user-friendly messages

### Real Swap (with friend)
- [ ] Small test amount chosen (e.g., 0.0001 BTC)
- [ ] Screenshot deposit details before sending
- [ ] Monitor status page during swap
- [ ] Verify SUCCESS status and ZEC receipt

---

## Support & Resources

### 1Click API Documentation
- Base URL: https://1click.chaindefuser.com/
- API Spec: https://1click.chaindefuser.com/docs/v0/openapi.yaml
- Partners Portal: https://partners.near-intents.org/

### Useful Blockchain Explorers
- **Bitcoin:** blockchain.com/explorer or mempool.space
- **Ethereum:** etherscan.io
- **Zcash:** zcashblockexplorer.com or zcha.in
- **Solana:** solscan.io

### Your Integration Files
- `/lib/swap/oneClick.js` - API client
- `/lib/swap/swapPayload.js` - Payload builder
- `/app/[slug]/providers/swap-provider.jsx` - State management
- `/ui/swap/SwapComposer.jsx` - Quote form
- `/ui/swap/SwapDepositDisplay.jsx` - Deposit display
- `/app/swap/page.jsx` - Status page

---

## Next Steps After Testing

1. **Document any issues found** during testing
2. **Measure success rate** of swaps
3. **Monitor user feedback** on swap flow
4. **Consider adding:**
   - Transaction history
   - Email notifications for status changes
   - More detailed error messages
   - Swap estimates/calculator
5. **Analytics:** Track quote requests, confirmations, success/failure rates

---

## Questions to Answer During Testing

- [ ] How long does a typical BTC → ZEC swap take?
- [ ] What's the typical slippage vs. quote?
- [ ] Do QR codes work with popular wallets (e.g., Trust Wallet, MetaMask)?
- [ ] Is the status polling frequency appropriate (too fast/slow)?
- [ ] Are error messages clear to non-technical users?
- [ ] Does the "I've Sent Funds" flow feel natural?
- [ ] Should we add a countdown timer for deposit deadline?
- [ ] Do we need email notifications?

---

Good luck with testing! 🚀
