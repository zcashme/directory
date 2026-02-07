# Quick Testing Checklist - 1Click Swap Feature

## ✅ Pre-Flight Checks (DONE)
- [x] API key configured in .env
- [x] ZEC token available via API
- [x] BTC and other tokens available
- [x] API endpoints responding

---

## 🖥️ UI Testing (Do These Now)

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Navigate to Swap Page
Go to the page where your swap component is rendered

### Step 3: Test Quote Flow

**Action:** Fill out the swap form
- [ ] From token: Select BTC (or ETH, USDC, SOL)
- [ ] To token: Should show ZEC
- [ ] Amount: Enter 0.001
- [ ] Refund address: Enter valid BTC address
- [ ] Destination: Enter valid ZEC address (t-address)
- [ ] Slippage: Leave at default (0.5%)

**Click "Get Quote" button**

**Verify:**
- [ ] Quote appears showing:
  - Amount to receive (in ZEC)
  - Min amount out (with slippage)
  - Estimated time (e.g., ~2-5 minutes)
  - USD values
- [ ] No errors in browser console (F12)
- [ ] Loading indicator appears while fetching

---

### Step 4: Test Deposit Flow

**Click "Confirm Swap" button**

**Verify:**
- [ ] Deposit address is generated
- [ ] QR code displays
- [ ] Shows exact amount to send
- [ ] "Copy Address" button works
- [ ] "I've Sent Funds" button is visible
- [ ] Can save QR code

**⚠️ DO NOT send funds yet - just verify UI**

---

### Step 5: Test "I've Sent Funds" Navigation

**Click "I've Sent Funds" button**

**Verify:**
- [ ] Navigates to `/swap?depositAddress=...`
- [ ] Status page loads
- [ ] Shows correct token pair (e.g., BTC → ZEC)
- [ ] Status shows "Pending Deposit" or similar
- [ ] Polling indicator animates (dots or spinner)

---

### Step 6: Test Status Polling

**With /swap page open:**

**Open Browser DevTools (F12) → Network tab**

**Verify:**
- [ ] See requests to `/api/swap/status` or `/v0/status`
- [ ] Requests happen every ~1 second initially
- [ ] After 5 requests, slows to ~5 seconds
- [ ] Status stays "PENDING_DEPOSIT" (no funds sent)
- [ ] No JavaScript errors in Console tab

---

### Step 7: Test Manual Status Entry

**Navigate to `/swap` (no query params)**

**Verify:**
- [ ] Shows form to enter deposit address
- [ ] Can paste deposit address from earlier
- [ ] Submit button works
- [ ] Shows status "PENDING_DEPOSIT"

---

## 🔍 Code Review (Understand the Implementation)

### Key Files to Review

**1. API Client** (`/lib/swap/oneClick.js`)
```bash
# View the API integration
cat lib/swap/oneClick.js | head -n 50
```
- Line 48: Token filtering (ZEC, BTC, ETH, USDC, USDT, SOL)
- Line 1-23: API authentication and timeout handling

**2. Swap State Management** (`/app/[slug]/providers/swap-provider.jsx`)
- Contains all swap logic and status polling
- Adaptive polling: 1s → 5s intervals
- 5-minute timeout, 3 retries per poll

**3. Deposit Display** (`/ui/swap/SwapDepositDisplay.jsx`)
- Line 170: "I've Sent Funds" button
- QR code generation
- Address copying functionality

**4. Status Page** (`/app/swap/page.jsx`)
- Public swap tracking
- Query param handling (`depositAddress`)

---

## 🚨 Error Testing

### Test Invalid Inputs

- [ ] Empty amount → Should show error or disable button
- [ ] Zero amount → Should show error
- [ ] Invalid BTC address → Should fail on quote
- [ ] Invalid ZEC address → Should fail on quote

### Test Network Errors

**In browser console:**
```javascript
// Simulate network failure
const old = window.fetch;
window.fetch = (...args) => {
  if (args[0].includes('swap') || args[0].includes('1click')) {
    return Promise.reject(new Error('Network error'));
  }
  return old(...args);
};

// Try getting a quote → should show error
// Restore: window.fetch = old;
```

**Verify:**
- [ ] Shows user-friendly error message
- [ ] Can retry after error
- [ ] No crash or infinite loading

---

## 💸 Real Swap Testing (With Friend)

⚠️ **Only do this after all above tests pass!**

### Recommended First Swap
- **Amount:** 0.0001 BTC → ZEC (very small test)
- **Why:** Minimal risk, tests full flow

### Pre-Swap Checklist
- [ ] All UI tests passed
- [ ] Verified quote amounts are acceptable
- [ ] Screenshot deposit instructions
- [ ] Have ZEC wallet ready to check receipt

### During Swap
1. [ ] Get quote in UI
2. [ ] Click "Confirm Swap"
3. [ ] Send **exact** amount shown to deposit address
4. [ ] Click "I've Sent Funds"
5. [ ] Watch status page for updates

### Expected Status Flow
```
PENDING_DEPOSIT
    ↓ (you send funds)
PROCESSING
    ↓ (swap executing)
SUCCESS
```

### Post-Swap Verification
- [ ] Status shows "SUCCESS"
- [ ] ZEC received in destination wallet
- [ ] Amount ≥ min amount out (from quote)
- [ ] Can initiate another swap

---

## 📝 Notes & Observations

**Things to document during testing:**

1. **Quote Quality**
   - How long does quote take to generate? ______
   - Are amounts reasonable? ______
   - USD values accurate? ______

2. **Deposit Flow**
   - QR code scans with wallet? ______
   - "I've Sent Funds" intuitive? ______

3. **Status Polling**
   - Polling too fast/slow? ______
   - Status updates timely? ______

4. **Real Swap (if done)**
   - Total swap time: ______
   - Actual amount received: ______
   - Any issues: ______

---

## ❓ Questions Answered

After testing, you should know:

- ✅ Does the quote flow work smoothly?
- ✅ Is the deposit display clear?
- ✅ Does status polling work correctly?
- ✅ Are errors handled gracefully?
- ✅ Is the feature ready for production?

---

## 🐛 Issues Found

**Document any issues here:**

1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

---

## ✅ Sign-Off

- [ ] All UI tests passed
- [ ] Error handling works
- [ ] Status polling verified
- [ ] Ready for real swap test
- [ ] Feature approved for production

**Tested by:** _______________ **Date:** ___________
