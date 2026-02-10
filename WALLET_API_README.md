# Zcash.me Wallet API Guide

This document explains why these endpoints exist, what they return, and how a wallet should use them.

## Why these endpoints exist

- Help wallet users find verified Zcash addresses by username or social handle.
- Provide a simple, stable API for wallet integrations without exposing the full directory UI.
- Keep results consistent with the directory search experience.

## Authentication

All requests must include the shared API key:

```
X-API-Key: YOUR_KEY
```

If the key is missing or invalid, the API returns `401 unauthorized`.

### Base URLs

- Local: `http://localhost:3000`
- Production: `https://your-domain.com`

## Rate limits and caching

- Rate limit: 60 requests per minute per IP.
- Caching (server-side):
  - `/api/directory`: 30 seconds
  - `/api/resolve`: 60 seconds
  - `/api/social`: 300 seconds

If you exceed the rate limit, you will receive `429 rate_limited`.

## Endpoints

### 1) Resolve by username

`GET /api/resolve?username=<username>`

Use this after the user selects a specific username.

Example:
```
GET /api/resolve?username=cobra
```

Example response:
```
{
  "username": "cobra",
  "display_name": "Cobra",
  "profile_image_url": "https://example.com/avatar.jpg",
  "bio": "Zcash enthusiast and builder.",
  "nearest_city_name": "Denver",
  "address": "u1...",
  "address_verified": true,
  "verified_at": "2025-10-23T10:58:54.721199+00:00",
  "authenticated_links": [
    { "id": 1, "label": "cobra.example.com", "url": "https://cobra.example.com", "is_verified": true }
  ],
  "unauthenticated_links": [
    { "id": 2, "label": "cobracrypto", "url": "https://x.com/cobracrypto", "is_verified": false }
  ]
}
```

Response fields:
```
{
  "username": "cobra",
  "display_name": "Cobra",
  "profile_image_url": "https://example.com/avatar.jpg",
  "bio": "Zcash enthusiast and builder.",
  "nearest_city_name": "Denver",
  "address": "u1...",
  "address_verified": true,
  "verified_at": "2025-10-23T10:58:54.721199+00:00",
  "authenticated_links": [
    { "id": 1, "label": "cobra.example.com", "url": "https://cobra.example.com", "is_verified": true }
  ],
  "unauthenticated_links": [
    { "id": 2, "label": "cobracrypto", "url": "https://x.com/cobracrypto", "is_verified": false }
  ]
}
```

### 2) Directory search

`GET /api/directory?q=<search>&limit=25&cursor=<token>&verified_only=true`

Use this to power autocomplete or search lists.

Search behavior:
- Matches usernames (case-insensitive).
- Matches social handles extracted from links (e.g., `x.com/handle`, `linkedin.com/in/handle`).
- Matches non-social domains by domain (e.g., `example.com` matches `www.example.com`).

Ranking behavior:
1) Usernames that start with the query
2) Link handles or non-social domains that start with the query
3) Usernames that include the query
4) Link handles or non-social domains that include the query

Example:
```
GET /api/directory?q=c&limit=25
```

Example response:
```
{
  "results": [
    {
      "username": "cobra",
      "display_name": "Cobra",
      "profile_image_url": "https://example.com/avatar.jpg",
      "bio": "Zcash enthusiast and builder.",
      "nearest_city_name": "Denver",
      "address": "u1...",
      "address_verified": true,
      "verified_at": "2025-10-23T10:58:54.721199+00:00",
      "authenticated_links": [
        { "id": 1, "label": "cobra.example.com", "url": "https://cobra.example.com", "is_verified": true }
      ],
      "unauthenticated_links": [
        { "id": 2, "label": "cobracrypto", "url": "https://x.com/cobracrypto", "is_verified": false }
      ]
    }
  ],
  "next_cursor": "eyJuYW1lIjoiY29icmEiLCJpZCI6MX0"
}
```

### 3) Resolve by social handle

`GET /api/social?platform=<platform>&handle=<handle>`

Use this if the wallet wants to resolve a social handle directly.

Example:
```
GET /api/social?platform=x&handle=thefrankbraun
```

Example response:
```
{
  "link": {
    "platform": "x",
    "handle": "thefrankbraun",
    "url": "https://x.com/thefrankbraun",
    "is_verified": true
  },
  "address": "u1...",
  "profile_name": "Example Name",
  "address_verified": true
}
```

Response:
```
{
  "link": {
    "platform": "x",
    "handle": "thefrankbraun",
    "url": "https://x.com/thefrankbraun",
    "is_verified": true
  },
  "address": "u1...",
  "profile_name": "Example Name",
  "address_verified": true
}
```

## Pagination with cursor

If `next_cursor` is present, pass it back to fetch the next page:

```
GET /api/directory?q=c&limit=25&cursor=eyJuYW1lIjoiY29icmEiLCJpZCI6MX0
```

Treat the cursor as an opaque token. Do not parse or modify it.

## Common errors & handling

- `401 unauthorized`: API key missing or invalid. Verify the `X-API-Key` header.
- `429 rate_limited`: Too many requests. Retry after ~60 seconds or use exponential backoff.
- `500 profile_lookup_failed` / `links_lookup_failed` / `search_failed`: Temporary server/database errors. Retry after a short delay.

### Error payloads

Errors are returned as JSON with an `error` string and sometimes a context field:

```
{ "error": "unauthorized" }
{ "error": "rate_limited" }
{ "error": "not_found", "username": "cobra" }
{ "error": "unsupported_platform", "handle": null }
```

## Cache behavior

Responses are cached server-side for short periods. This means very recent profile updates
may not appear immediately:

- `/api/directory`: ~30s
- `/api/resolve`: ~60s
- `/api/social`: ~300s

## Recommended UX guidelines

- Debounce search input by 200–300ms.
- Start searching after 1–2 characters to reduce noise.
- Show a verified badge when `address_verified` is true or a verified link exists.

## Security guidance

Try to keep the API key on a backend server (proxy) when possible. If you must ship it in a client app,
assume it can be extracted and plan to rotate the key if needed.

## Edge case examples

Not found:
```
{ "error": "not_found", "username": "nonexistent" }
```

Rate limited:
```
{ "error": "rate_limited" }
```

## Minimal integration flow

1) User types a search term -> call `/api/directory?q=...`
2) Show results (username + display name + verified badge)
3) On selection, call `/api/resolve?username=...` to get the address
4) Optionally, allow direct social lookup with `/api/social?platform=...&handle=...`

## Technical Implementation 1: Slash shorthand resolution

Goal: Let users enter `/username` instead of `zcash.me/username`.

### Trigger

- If the Send/Address input starts with `/`, treat it as a Zcash.me username.
- Extract the username with `^/([A-Za-z0-9_-]+)$`.

### Lookup

```
GET /api/resolve?username=<username>
X-API-Key: YOUR_KEY
```

### Example response

```
{
  "username": "cobra",
  "display_name": "Cobra",
  "profile_image_url": "https://example.com/avatar.jpg",
  "bio": "Zcash enthusiast and builder.",
  "nearest_city_name": "Denver",
  "address": "u1...",
  "address_verified": true,
  "verified_at": "2025-10-23T10:58:54.721199+00:00",
  "authenticated_links": [
    { "id": 1, "label": "cobra.example.com", "url": "https://cobra.example.com", "is_verified": true }
  ],
  "unauthenticated_links": [
    { "id": 2, "label": "cobracrypto", "url": "https://x.com/cobracrypto", "is_verified": false }
  ]
}
```

### UX behavior

- On success, replace the input with the resolved `address`.
- Show a confirmation card with `display_name`, `username`, `profile_image_url`, and verification status.

### Error handling

- `404 not_found`: show "User not found"
- `401 unauthorized`: show "API key missing or invalid"
- `429 rate_limited`: show "Please try again"
- `500`: show "Temporary error, retry"
