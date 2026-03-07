# URL Prefill README

This document describes the URL prefill behavior for profile pages (`/{name}`) in zcash.me.

## Goal

Allow links like `https://zcash.me/{name}?...` (or `http://localhost:3000/{name}?...`) to prefill:

1. Memo text
2. Amount field (crypto)
3. Fiat pill (currency + fiat amount)
4. Swap mode token selection for non-ZEC tickers

## Where It Is Implemented

1. `app/[slug]/page.tsx`
2. `app/[slug]/ProfilePage.tsx`
3. `ui/messaging/MemoComposer.tsx`
4. `ui/swap/SwapComposer.tsx`
5. `ui/verification/AmountAndWallet.tsx`

## Canonical Redirect Behavior

If a non-canonical slug is visited (example: wrong casing), the app redirects to canonical slug **and preserves query params**.

Example:

`/Savezcash?memo=Hi&ticker=ZEC&amount=0.01`  
redirects to canonical slug and keeps `?memo=Hi&ticker=ZEC&amount=0.01`.

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
2. Up to 8 decimals for crypto amount parsing

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
2. Up to 2 decimals for fiat amount parsing

### Base Layer (for tokens available on multiple chains)

1. `base_layer`
2. `baseLayer`
3. `base`
4. `chain`
5. `network`
6. `layer`
7. `blockchain`

If missing and multiple base layers exist for the ticker, first token match from loaded token list is used.

## Prefill Rules

### Donate mode (`ticker=ZEC` or no ticker)

1. `memo` is applied.
2. If `fiat` + fiat amount is present, fiat pill is opened and conversion updates crypto amount.
3. If fiat prefill is not present, crypto amount prefill is applied from `zec` or `amount`.

### Swap mode (`ticker` is non-ZEC and exists in token list)

1. Opens swap composer with selected token.
2. Memo is ignored in swap mode.
3. If only crypto amount is provided, crypto amount is applied.
4. If fiat prefill is provided without crypto amount, fiat pill is opened and conversion updates token amount.
5. If both crypto and fiat amounts are provided, **crypto amount wins**.

### Memo carry-over behavior

If URL includes a memo with non-ZEC ticker:

1. Memo is ignored while in swap mode.
2. If user switches ticker back to ZEC, memo appears in memo composer.

## Additional Behavior

If URL provides non-ZEC ticker with crypto amount and no fiat amount:

1. Swap view auto-opens fiat pill from crypto amount.
2. Fiat state is persisted in session storage.
3. If user switches to ZEC, that fiat state carries over and continues driving ZEC amount conversion.

## Example URLs

### Donate / memo

`http://localhost:3000/SaveZcash?memo=Thanks&ticker=ZEC&amount=0.01`

### Donate / fiat

`http://localhost:3000/SaveZcash?memo=Thanks&fiat=USD&amount=25.50`

### Swap / crypto amount

`http://localhost:3000/SaveZcash?memo=Thanks&ticker=BTC&amount=0.001`

### Swap / fiat only

`http://localhost:3000/SaveZcash?ticker=ETH&fiat=USD&fiat_amount=50`

### Swap / both crypto and fiat (crypto wins)

`http://localhost:3000/SaveZcash?ticker=BTC&amount=0.001&fiat=USD&fiat_amount=25`

### Multi-base-layer token with explicit chain

`http://localhost:3000/SaveZcash?ticker=USDC&base_layer=solana&fiat=USD&fiat_amount=30`

