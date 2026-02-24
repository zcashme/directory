# /lib/api

API guard and shared response types.

## guard.ts

`enforceApiGuard(request, options?)` — validates API key and applies per-IP rate limiting. Returns a `Response` on failure or `{ ok: true, cacheSeconds }` on success.

Options: `{ cacheSeconds?: number, rateLimitPerMinute?: number }` (default 60/min).

`withCacheHeaders(headers, cacheSeconds)` — adds `Cache-Control: s-maxage` when cacheSeconds > 0.

## types.ts

`APIResponse<T>` = `SuccessResponse<T> | ErrorResponse<T>` — standard `{ ok, data, error }` discriminated union used across API boundaries.

Also exports domain-specific response types (`DirectoryResponse`, `ConfirmOtpResponse`, `ProfileEditsPayload`, etc.) and payload interfaces used by server actions.

## Environment Variables

```
API_KEY              - Server-side key checked by enforceApiGuard
NEXT_PUBLIC_API_KEY  - Client-side key for authenticated fetches
```
