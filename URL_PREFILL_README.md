# URL Prefill + Paylink README

This document describes:

1. URL prefill parsing/hydration for profile pages (`/{name}`)
2. The profile-menu paylink builder UI (`Create Paylink`)

## Goal

Allow links like `https://zcash.me/{name}?...` (or `http://localhost:3000/{name}?...`) to prefill:

1. Memo text
2. Crypto amount
3. Fiat amount/currency
4. Swap mode token selection for non-ZEC tickers

Also allow profile owners to generate a shareable paylink from the profile menu.

## Where It Is Implemented

### URL parsing + hydration

1. `app/[slug]/page.tsx`
2. `app/[slug]/ProfilePage.tsx`
3. `ui/messaging/MemoComposer.tsx`
4. `ui/swap/SwapComposer.tsx`
5. `ui/verification/AmountAndWallet.tsx`

### Paylink builder UI

1. `ui/profile/ProfileCardActions.tsx` (menu entry: `Create Paylink`)
2. `ui/profile/ProfileCard.tsx` (opens/closes modal)
3. `ui/profile/CreatePrefillUrlModal.tsx` (builder + preview)

## Canonical Redirect Behavior

If a non-canonical slug is visited, the app redirects to canonical slug and preserves query params.

Example:

`/Savezcash?memo=Hi&ticker=ZEC&amount=0.01`  
redirects to canonical slug with the same query string.

## Supported Query Parameters

### Memo

1. `memo`
2. `m` (alias)

Memo is capped to 512 bytes.

### Ticker

1. `ticker`
2. `asset` (alias)
3. `token` (alias)

### Crypto Amount

1. `amount`
2. `amt` (alias)
3. `value` (alias)
4. `zec` (ZEC-specific alias)

Validation:

1. Positive decimal only
2. Up to 8 decimals

### Fiat

1. `fiat`
2. `currency` (alias)

Fiat amount sources:

1. `fiat_amount`
2. `fiatAmount` (alias)
3. `fiat_amt` (alias)
4. `fiatValue` (alias)
5. Fallback to shared `amount` if explicit fiat amount is not provided

Validation:

1. Positive decimal only
2. Up to 2 decimals

### Base Layer (parser still supports it)

1. `base_layer`
2. `baseLayer`
3. `base`
4. `chain`
5. `network`
6. `layer`
7. `blockchain`

If missing and multiple base layers exist for a non-ZEC ticker, first token match is used.

## Prefill Rules

### Donate mode (`ticker=ZEC` or no ticker)

1. `memo` is applied.
2. If `fiat` + fiat amount exists, fiat is hydrated and conversion updates crypto amount.
3. If fiat prefill does not exist, crypto amount prefill is used (`zec` or shared amount).

### Swap mode (`ticker` is non-ZEC and exists in token list)

1. Opens swap composer with selected token.
2. Memo is ignored in swap mode.
3. If only crypto amount is provided, crypto amount is applied.
4. If fiat prefill is provided without crypto amount, fiat drives token conversion.
5. If both crypto and fiat amounts are provided, crypto amount wins.

### Memo carry-over behavior

If URL includes memo with non-ZEC ticker:

1. Memo is hidden in swap mode.
2. If user switches token back to ZEC, memo appears in memo composer.

## Paylink Builder Behavior (Profile Menu)

The modal is opened from `Create Paylink` in the profile menu.

Current builder behavior:

1. Crypto ticker is fixed to `ZEC` (no crypto/base-layer selector in builder).
2. User can edit `Amount (ZEC)` and/or `Amount (fiat)` with fiat ticker selection.
3. Fiat and ZEC amounts stay synchronized using current rate.
4. Last modified amount field controls URL amount params:
   1. Last modified ZEC field -> `ticker=ZEC&amount=...`
   2. Last modified fiat field -> `fiat=...&fiat_amount=...`
5. Memo input is available and capped to 512 bytes.
6. Builder includes `Close`, `Open URL`, `Copy URL`, `Share URL`.

UI note shown in builder:

`Payable in ZEC, BTC, SOL, USDT, USDC - you will receive ZEC.`

## Example URLs

### Builder output when ZEC amount is last modified

`http://localhost:3000/SaveZcash?memo=Thanks&ticker=ZEC&amount=0.01`

### Builder output when fiat amount is last modified

`http://localhost:3000/SaveZcash?memo=Thanks&fiat=USD&fiat_amount=25.00`

### Manual swap URL (still supported by parser)

`http://localhost:3000/SaveZcash?ticker=BTC&amount=0.001`

