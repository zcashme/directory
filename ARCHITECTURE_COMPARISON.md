# Architecture Comparison: dev/jules vs bitcoiner Branch

**Date:** 2026-02-05  
**Status:** Critical differences identified

---

## 🔴 CRITICAL FINDING: Different Swap Workflows

### `dev/jules` Branch (My Implementation)
**Workflow:** AUTOMATIC (as specified in BITCOINER_IMPLEMENTATION_GUIDE.md)
- ✅ Auto-confirm on changes (debounced 800ms) - **REQUIRED per spec**
- ✅ Auto status polling (every 6 seconds until completion)
- ✅ Recipient ZEC address display below QR - **REQUIRED per spec**
- ✅ No manual buttons (fully automatic)
- ✅ `useDebounce` from `use-debounce` package

### `bitcoiner` Branch
**Workflow:** MANUAL (does NOT match specification)
- ❌ NO auto-confirm - requires manual "Get quote" + "Confirm quote" buttons
- ❌ NO auto status polling - swap status only shows "AWAITING_DEPOSIT"
- ❌ NO recipient ZEC address display below QR
- ✅ Manual slippage tolerance UI with presets
- ✅ Quote display card showing from/to amounts

---

## 📊 Directory Structure Differences

### `dev/jules` Branch
```
app/
  api/
  [slug]/
ui/
  messaging/
    MemoComposer.jsx          ← Main component
    useFeedback.js
    useEmojiAutocomplete.js
  verification/
    AmountAndWallet.jsx
  profile/
lib/
  supabase/
  profile/
  zcash/
```

### `bitcoiner` Branch
```
app/
  api/
src/
  feedback/
    ZcashFeedbackDraft.jsx    ← Main component
  hooks/
    useFeedback.js
    useFeedbackController.js
    useEmojiAutocomplete.js
  components/
    AmountAndWallet.jsx
    ProfileSearchDropdown.jsx
  utils/
```

---

## 🔑 Key File Name Differences

| Feature | dev/jules | bitcoiner |
|---------|-----------|-----------|
| Main component | `ui/messaging/MemoComposer.jsx` | `src/feedback/ZcashFeedbackDraft.jsx` |
| Amount input | `ui/verification/AmountAndWallet.jsx` | `src/components/AmountAndWallet.jsx` |
| Feedback hook | `ui/messaging/useFeedback.js` | `src/hooks/useFeedback.js` |
| Controller hook | `ui/messaging/useFeedback.js` | `src/hooks/useFeedbackController.js` |
| Emoji hook | `ui/messaging/useEmojiAutocomplete.js` | `src/hooks/useEmojiAutocomplete.js` |
| Profile search | `ui/profile/ProfileSearchDropdown.jsx` | `src/components/ProfileSearchDropdown.jsx` |

---

## 🔧 Implementation Differences

### 1. **Auto-Confirm Functionality**

#### dev/jules (✅ Implemented per spec)
```javascript
// Uses useDebounce from 'use-debounce'
const [debouncedAmount] = useDebounce(amount, 800);
const [debouncedRefundAddress] = useDebounce(refundAddress, 800);

useEffect(() => {
  if (!isSwapMode) return;
  if (!debouncedAmount || parseFloat(debouncedAmount) <= 0) return;
  if (!profile?.address) return;
  if (!debouncedRefundAddress) return;
  if (!originTokenId || !zecTokenId) return;

  handleAutoConfirm();  // Automatically calls /api/swap/confirm
}, [debouncedAmount, originTokenId, profile?.address, debouncedRefundAddress, isSwapMode]);
```

#### bitcoiner (❌ NOT implemented)
```javascript
// Manual buttons only
<button onClick={handleGetQuote}>Get quote</button>
<button onClick={handleConfirmQuote}>Confirm quote</button>

// No debounce, no auto-trigger
```

**Impact:** The bitcoiner branch requires users to manually click buttons for every change, not meeting the spec requirement for auto-confirm.

---

### 2. **Status Polling**

#### dev/jules (✅ Implemented per spec)
```javascript
const startStatusPolling = (key) => {
  const pollStatus = async () => {
    // Fetches /api/swap/status
    const response = await fetch(`/api/swap/status?${params}`);
    // Updates swap status
    // Stops on terminal states (SUCCESS, FAILED, REFUNDED)
  };
  
  pollStatus();
  pollIntervalRef.current = setInterval(pollStatus, 6000);  // Every 6 seconds
};
```

#### bitcoiner (❌ NOT implemented)
```javascript
// Only sets initial status
setSwapStatus("AWAITING_DEPOSIT");

// No polling implementation
// Status never updates after initial set
```

**Impact:** Users in bitcoiner branch never see swap progress or completion status.

---

### 3. **Recipient ZEC Address Display**

#### dev/jules (✅ Implemented per spec)
```javascript
{isSwapMode && depositUri && profile?.address && (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="text-xs text-gray-600 mb-2 font-medium">
      Recipient will receive ZEC at:
    </div>
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono flex-1 break-all text-gray-800">
        {profile.address}
      </code>
      <CopyButton text={profile.address} />
    </div>
    <div className="text-xs text-gray-500 mt-2 italic">
      After you send {originSymbol} to the address above, it will be automatically 
      swapped to ZEC and delivered to this address.
    </div>
  </div>
)}
```

#### bitcoiner (❌ NOT implemented)
```javascript
// No recipient address display
// Users don't see where ZEC will be delivered
```

**Impact:** Critical UX issue - users don't know where their ZEC will end up.

---

### 4. **Rates API**

#### dev/jules (✅ Enhanced)
```javascript
// Added ASSET_MAPPING for extensibility
const ASSET_MAPPING = {
  ZEC: { coinbase: "ZEC", coingecko: "zcash", cryptocompare: "ZEC" },
  BTC: { coinbase: "BTC", coingecko: "bitcoin", cryptocompare: "BTC" },
  ETH: { coinbase: "ETH", coingecko: "ethereum", cryptocompare: "ETH" },
};

// Reduced cache: 10s
fetch(provider.url, { next: { revalidate: 10 } });
```

#### bitcoiner (✅ Also enhanced)
```javascript
// Similar implementation with COINGECKO_ID_BY_SYMBOL
const COINGECKO_ID_BY_SYMBOL = {
  BTC: "bitcoin",
  ETH: "ethereum",
  ZEC: "zcash",
  // More tokens...
};

// Also has 10s cache
fetch(provider.url, { next: { revalidate: 10 } });
```

**Impact:** Both branches have similar rates API enhancements. ✅

---

### 5. **Swap Mode Detection**

#### dev/jules
```javascript
const isSwapMode = originTokenId !== null && 
                   zecTokenId !== null && 
                   originTokenId !== zecTokenId;
```

#### bitcoiner
```javascript
const isZecMode = !!originTokenId && !!zecTokenId && 
                  originTokenId === zecTokenId;
const isSwapMode = !!originTokenId && !!zecTokenId && 
                   originTokenId !== zecTokenId;
```

**Impact:** bitcoiner has both modes defined explicitly (minor difference).

---

### 6. **Component Props**

#### dev/jules AmountAndWallet
```javascript
<AmountAndWallet
  asset={originSymbol}
  assetOptions={tokenOptions}
  setAsset={(tokenId) => { /* ... */ }}
  showRefund={isSwapMode}
  refundAddress={refundAddress}
  setRefundAddress={setRefundAddress}
/>
```

#### bitcoiner AmountAndWallet
```javascript
<AmountAndWallet
  asset={originSymbol || "…"}
  assetOptions={tokenOptions}
  setAsset={(tokenId) => { /* ... */ }}
  showRefund={isSwapMode}
  refundLabel={refundLabel}
  refundAddress={refundAddress}
  setRefundAddress={setRefundAddress}
  refundPlaceholder={`Paste your ${originSymbol || ""} address`}
/>
```

**Impact:** bitcoiner has more props for refund field customization.

---

## 📦 Backend API Routes

### Both Branches Have Identical Backend ✅
- `/api/swap/tokens` - Token list
- `/api/swap/quote` - Get quote (dry run)
- `/api/swap/confirm` - Confirm swap
- `/api/swap/status` - Poll status
- `lib/oneClick.js` - API client
- `lib/swapPayload.js` - Utilities

**Note:** Only tiny difference in confirm route (duplicate `paymentUri` field in bitcoiner).

---

## 🎨 UI/UX Differences

### dev/jules
- Minimalist - no manual buttons
- Auto-everything workflow
- Swap status with color-coding
- "Back to ZEC payment" cancel button
- Recipient address prominently displayed

### bitcoiner
- More explicit controls
- Manual quote/confirm workflow
- Slippage tolerance UI with presets (0.1%, 0.5%, 1%, 2%, 5%)
- Quote display card with from/to amounts
- Cancel button (✕) in memo field top-right

---

## 📝 Specification Compliance

### According to BITCOINER_IMPLEMENTATION_GUIDE.md

#### ✅ dev/jules Implementation
- ✅ Auto-confirm on changes (debounced ~800ms) - **REQUIRED**
- ✅ Status polling every 6 seconds - **REQUIRED**
- ✅ Recipient ZEC address display - **REQUIRED**
- ✅ QR code uses deposit URI in swap mode
- ✅ Memo disabled in swap mode
- ✅ Token selector dropdown
- ✅ Refund address input
- ✅ Rates API asset parameter

#### ⚠️ bitcoiner Implementation
- ❌ NO auto-confirm - **MISSING REQUIRED FEATURE**
- ❌ NO status polling - **MISSING REQUIRED FEATURE**
- ❌ NO recipient ZEC address display - **MISSING REQUIRED FEATURE**
- ✅ QR code uses deposit URI
- ✅ Memo disabled in swap mode
- ✅ Token selector dropdown
- ✅ Refund address input
- ✅ Rates API asset parameter
- ✅ Slippage tolerance UI (bonus feature)
- ✅ Quote display card (bonus feature)

---

## 🔄 Migration Path

### Option 1: Merge dev/jules into bitcoiner
**Effort:** High (4-6 hours)
- Adapt to `src/` directory structure
- Update all import paths
- Merge with existing UI components
- Keep slippage UI and quote display from bitcoiner
- Add auto-confirm, polling, and recipient address display

### Option 2: Port bitcoiner features to dev/jules
**Effort:** Low (1-2 hours)
- Add slippage tolerance UI with presets
- Add quote display card
- Keep auto-confirm and polling

### Option 3: Merge bitcoiner into dev/jules (Reverse merge)
**Effort:** High (6-8 hours)
- Move all src/ files to ui/ structure
- Update all imports throughout codebase
- Massive refactor

---

## 🎯 Recommendation

**Use dev/jules as the base** and optionally add UI polish from bitcoiner:

### Why dev/jules is better:
1. ✅ **Meets all spec requirements** (auto-confirm, polling, recipient display)
2. ✅ **Better UX** - fully automatic, less friction
3. ✅ **Current directory structure** - matches existing codebase
4. ✅ **Simpler** - less UI complexity, clearer flow

### What to add from bitcoiner:
- Slippage tolerance presets UI (nice-to-have)
- Quote display card (nice-to-have)
- Better refund label customization

### Critical fixes needed in bitcoiner:
1. **Add auto-confirm** - Spec says "REQUIRED"
2. **Add status polling** - Spec says "REQUIRED"
3. **Add recipient address display** - Spec says "REQUIRED"

---

## 🚀 Next Steps

1. **Decision:** Choose which branch to use as base
2. **If dev/jules:** Optionally add slippage UI and quote card
3. **If bitcoiner:** Add the 3 missing required features
4. **Testing:** Full end-to-end testing with 1Click API
5. **Merge:** Create PR to merge to main

---

## 📋 Summary Table

| Feature | dev/jules | bitcoiner | Spec Required |
|---------|-----------|-----------|---------------|
| Auto-confirm | ✅ | ❌ | ✅ YES |
| Status polling | ✅ | ❌ | ✅ YES |
| Recipient address display | ✅ | ❌ | ✅ YES |
| Token selector | ✅ | ✅ | ✅ YES |
| Refund address input | ✅ | ✅ | ✅ YES |
| Rates API asset support | ✅ | ✅ | ✅ YES |
| QR deposit URI | ✅ | ✅ | ✅ YES |
| Memo disabled in swap | ✅ | ✅ | ✅ YES |
| Slippage presets UI | ❌ | ✅ | ❌ Optional |
| Quote display card | ❌ | ✅ | ❌ Optional |
| Manual buttons | ❌ | ✅ | ❌ Not in spec |
| Directory structure | `ui/` | `src/` | N/A |

**Score: dev/jules 8/8 required features ✅ | bitcoiner 5/8 required features ⚠️**

---

*This document identifies critical architectural differences and compliance issues between the two implementations.*
