


# Swap (NEAR Intents / 1Click)

This folder implements the `/swap` page for zcash.me, using the 1Click API server-side and a client UI that:
1) loads available tokens,
2) requests a quote,
3) confirms to get deposit instructions,
4) shows a QR code for a mobile wallet payment,
5) polls swap status until completion.

## Routes

UI:
- `/swap` → Swap page UI

API (Next.js Route Handlers):
- `GET /api/swap/tokens`  
  Fetches the token list from 1Click (server-side, API key never exposed).

- `POST /api/swap/quote`  
  Requests a dry-run quote. Returns a “display” block for the UI and raw debug JSON.

- `POST /api/swap/confirm`  
  Requests a real quote (`dry:false`) and returns deposit instructions:
  - deposit address
  - optional deposit memo
  - amount to deposit (decimal form)
  - `paymentUri` (preferred for QR, includes amount + memo when present)

- `GET /api/swap/status?depositAddress=...&depositMemo=...`  
  Polls status from 1Click.  
  **Important:** This endpoint expects `depositAddress` (required) and `depositMemo` (optional).  
  We intentionally do **not** rely on any in-memory server state (works in serverless environments).

## Environment Variables

Required:
- `ONECLICK_API_KEY`  
  API key for 1Click. Must be present on the server.

Optional:
- `ONECLICK_BASE_URL`  
  Default: `https://1click.chaindefuser.com`

- `ONECLICK_TIMEOUT_SECONDS`  
  Default: `45`  
  Controls the request timeout from our server to 1Click (tokens/quote/confirm/status).

## Timeouts & Polling

### Server → 1Click timeout
All calls to 1Click use a server-side timeout controlled by:
- `ONECLICK_TIMEOUT_SECONDS` (default `45s`)

If 1Click is slow or temporarily unavailable, the API will respond with:
- `{ ok: false, retryable: true, error: "..." }`

### UI polling interval
After a successful confirm, the UI starts polling:
- `GET /api/swap/status?depositAddress=...&depositMemo=...`
- default interval: **6 seconds**

Polling stops automatically when status becomes one of:
- `SUCCESS`
- `FAILED`
- `REFUNDED`

If status is temporarily unavailable, the UI shows:
- “Swap status temporarily unavailable; retrying…”

### Why we do NOT use swapId server-side
In-memory swap stores (like `SWAPS = {}`) are not reliable in:
- serverless deployments
- multiple worker processes
- dev hot reload

So status polling uses deposit details directly, which is stable and stateless.

## Common Troubleshooting

### 1) "Missing depositAddress" in raw JSON
Cause: UI is calling status like:
- `/api/swap/status?swapId=...`

Fix: status route expects:
- `/api/swap/status?depositAddress=...&depositMemo=...`

### 2) Tokens load but selects look wrong
Token objects can vary in shape. We normalize tokens into:
- `{ id, symbol, chain, ...rest }`
so the dropdown consistently displays:
- `SYMBOL (CHAIN)`

### 3) Confirm works but status never changes
This can happen if:
- payment hasn’t been made yet
- wallet didn’t send the exact amount / memo required
- 1Click status endpoint is delayed
- polling is blocked by adblock/CORS extensions (rare)

Check:
- raw JSON output
- server logs for status responses

## Styling

Swap page styling is scoped to:
- `app/globals.css`


