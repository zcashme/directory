# /lib/api - API Guard & Response Types

## Purpose
API authentication, caching helpers, and standardized response types used across
all API routes and server actions.

## What It Does

### API Guard
`enforceApiGuard(request, options?)` validates the API key from `x-api-key` or
`authorization` headers against `API_KEY` env var. Returns `{ ok: true, cacheSeconds }`
on success, or a 401/500 Response on failure.

`withCacheHeaders(headers, cacheSeconds)` adds `Cache-Control: s-maxage` and
`stale-while-revalidate` headers for CDN caching.

### Response Types
`APIResponse<T>` is the standard discriminated union: `{ ok: true, data: T }` or
`{ ok: false, error: string, retryable?: boolean }`. Used by all server actions and
API routes.

Domain-specific response types: `ConfirmOtpResponse`, `CreateProfileResponse`,
`CheckUsernameAvailabilityResponse`, `CheckAddressTakenResponse`,
`GetProfileLinksBatchResponse`, `GetNsProfilesResponse`, `ExchangeRate`.

Payload types: `CreateProfilePayload`, `ProfileEditsPayload` (with base64 avatar upload),
`AvatarUploadPayload`, `ProfileLinkEdit` (with `_delete` flag), `ProfileLinkInput`.

## File -> Feature Map

| File | Feature |
|------|---------|
| `guard.ts` | `enforceApiGuard()` API key validation, `withCacheHeaders()` cache control |
| `types.ts` | `APIResponse<T>` union, domain response types, payload interfaces |
