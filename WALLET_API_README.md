# Zcash.me Wallet API Guide

This document explains the API endpoints for wallet integrations with Zcash.me directory.

## Why these endpoints exist

- Help wallet users find verified Zcash addresses by username or social handle.
- Provide a simple, stable API for wallet integrations without exposing database internals.
- Power search, autocomplete, and directory browsing features.

## Base URLs

- Local: `http://localhost:3000`
- Production: `https://zcash.me`

## Authentication

Most endpoints require an API key:

```
X-API-Key: YOUR_KEY
```

If the key is missing or invalid, the API returns `401 unauthorized`.

To obtain an API key for your wallet, contact the Zcash.me team.

**Exception:** The `/api/lookup` endpoint is public and requires no authentication.

## Rate limits and caching

| Endpoint | Cache TTL | Auth |
|----------|-----------|------|
| `/api/lookup` | 300 seconds | Public |
| `/api/directory` | 30 seconds | API key |
| `/api/resolve` | 60 seconds | API key |
| `/api/social` | 300 seconds | API key |

---

## Endpoints

### 1) Lookup (Public)

```
GET /api/lookup/{username}
```

Resolve a ZcashMe username to a Zcash unified address. No authentication required. CORS enabled for browser-based clients.

This is the recommended endpoint for wallets that only need name-to-address resolution.

#### Example

```bash
curl https://zcash.me/api/lookup/yoshi
```

```javascript
const res = await fetch("https://zcash.me/api/lookup/yoshi");
const data = await res.json();
console.log(data.address); // "u1abc..."
```

#### Success Response (200)

```json
{
  "username": "yoshi",
  "display_name": "Yoshi",
  "address": "u1abc...",
  "address_verified": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | The canonical username (case-preserved) |
| `display_name` | string \| null | Optional display name set by the user |
| `address` | string | Zcash unified address |
| `address_verified` | boolean | Whether the user has verified ownership of this address |

#### Error Responses

| Status | Error Code | Meaning |
|--------|------------|---------|
| 400 | `invalid_username` | Empty or missing username |
| 404 | `not_found` | Username does not exist |
| 404 | `no_address` | Username exists but has no address set |
| 500 | `lookup_failed` | Internal error — safe to retry |
| 503 | `service_unavailable` | Service is temporarily down — safe to retry |

#### Notes

- Lookups are case-insensitive (`Yoshi`, `yoshi`, and `YOSHI` all resolve the same)
- An `address_verified: false` response means the address has not been cryptographically verified by the user — wallets may choose to warn before sending
- Responses are cached at the edge — address updates may take a few minutes to propagate

---

### 2) Directory Search

```
GET /api/directory?q=<search>&limit=25&cursor=<token>&verified_only=true
```

Use this endpoint to power autocomplete or search lists.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query (optional). Omit to browse all profiles. |
| `limit` | integer | 25 | Results per page (1-100) |
| `cursor` | string | - | Pagination cursor from previous response |
| `verified_only` | boolean | false | Only return profiles with verified addresses |

#### Search behavior

When `q` is provided:
- Matches usernames (case-insensitive)
- Matches social handles extracted from links (e.g., `x.com/handle`, `linkedin.com/in/handle`)
- Matches non-social domains (e.g., `example.com` matches `www.example.com`)

#### Ranking behavior

Results are ranked in this order:
1. Usernames that start with the query
2. Usernames that contain the query

#### Example

```
GET /api/directory?q=cobra&limit=25
```

#### Response

```json
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

#### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | array | Array of profile objects |
| `next_cursor` | string \| null | Cursor for next page, null if no more results |

#### Profile object fields

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Username (URL slug) |
| `display_name` | string \| null | Display name |
| `profile_image_url` | string \| null | Avatar URL |
| `bio` | string \| null | Profile bio |
| `nearest_city_name` | string \| null | Location |
| `address` | string \| null | Zcash address |
| `address_verified` | boolean | True if address is verified on-chain |
| `verified_at` | string \| null | ISO timestamp of last verification |
| `authenticated_links` | array | Links that have been verified |
| `unauthenticated_links` | array | Links that have not been verified |

#### Link object fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Link ID |
| `label` | string | Display label for the link |
| `url` | string | Full URL |
| `is_verified` | boolean | Whether link ownership is verified |

---

### 3) Resolve Username

```
GET /api/resolve/{username}
```

Full profile details for a specific user, including all links. Use this when you need more than just the address (bio, links, avatar, etc.).

For address-only resolution, prefer `/api/lookup/{username}` instead.

#### Example

```
GET /api/resolve/cobra
```

#### Response

```json
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

---

### 4) Resolve Social Handle

```
GET /api/social?platform=<platform>&handle=<handle>
```

Find a Zcash address from a social media handle.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | Social platform (see supported platforms) |
| `handle` | string | Yes | Username/handle on that platform |

#### Supported platforms

`x`, `twitter`, `github`, `instagram`, `reddit`, `linkedin`, `discord`, `tiktok`, `bluesky`, `mastodon`, `snapchat`, `telegram`

#### Example

```
GET /api/social?platform=x&handle=thefrankbraun
```

#### Response

```json
{
  "link": {
    "platform": "x",
    "handle": "thefrankbraun",
    "url": "https://x.com/thefrankbraun",
    "is_verified": true
  },
  "address": "u1...",
  "profile_name": "Frank Braun",
  "address_verified": true
}
```

#### Notes

- Only returns results for **verified** social links
- Handles messy input: `@handle`, `x.com/handle`, `https://twitter.com/handle` all work
- Prioritizes profiles with verified addresses

---

## Pagination

Use cursor-based pagination for browsing large result sets.

```
# First page
GET /api/directory?limit=100

# Response includes next_cursor
{ "results": [...], "next_cursor": "eyJuYW1lIjoiem9ybyIsImlkIjoxMDB9" }

# Next page
GET /api/directory?limit=100&cursor=eyJuYW1lIjoiem9ybyIsImlkIjoxMDB9
```

**Important:** Treat the cursor as an opaque token. Do not parse or modify it.

---

## Error handling

### Error response format

All errors return a JSON object with an `error` field:

```json
{ "error": "not_found" }
```

### HTTP status codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `invalid_username`, `missing_parameters` | Bad request |
| 401 | `unauthorized` | API key missing or invalid |
| 404 | `not_found`, `no_address` | Username or handle not found |
| 500 | `search_failed`, `lookup_failed`, `links_lookup_failed` | Server error |
| 503 | `service_unavailable` | Service temporarily down |

---

## Integration examples

### Simple wallet integration (recommended)

For wallets that just need to resolve a username to an address:

```javascript
async function resolveZcashMe(username) {
  const res = await fetch(`https://zcash.me/api/lookup/${encodeURIComponent(username)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.address;
}

// Usage
const address = await resolveZcashMe("yoshi");
if (address) sendZec(address, amount);
```

### Slash shorthand resolution

Allow users to type `/username` instead of full addresses:

```javascript
function parseInput(input) {
  const match = input.match(/^\/([A-Za-z0-9_-]+)$/);
  if (match) {
    return { type: 'zcashme', username: match[1] };
  }
  return { type: 'address', value: input };
}

async function resolveInput(input) {
  const parsed = parseInput(input);
  if (parsed.type === 'zcashme') {
    const res = await fetch(`https://zcash.me/api/lookup/${parsed.username}`);
    if (!res.ok) throw new Error('User not found');
    const data = await res.json();
    return data.address;
  }
  return parsed.value;
}
```

### Search with autocomplete

```javascript
// Debounce search input by 200-300ms
const response = await fetch(
  `https://zcash.me/api/directory?q=${encodeURIComponent(query)}&limit=10`,
  { headers: { 'X-API-Key': 'YOUR_KEY' } }
);
const { results } = await response.json();

// Display results with verified badge
results.forEach(profile => {
  const hasVerification = profile.address_verified || profile.authenticated_links.length > 0;
  console.log(`${profile.display_name || profile.username} ${hasVerification ? '✓' : ''}`);
});
```

---

## UX recommendations

1. **Debounce search input** by 200-300ms to reduce API calls
2. **Start searching after 1-2 characters** to reduce noise
3. **Show verified badge** when `address_verified` is true
4. **Cache results** client-side for responsive UX
5. **Handle errors gracefully** with user-friendly messages

---

## Changelog

- **2026-03:** Added public `/api/lookup/{username}` endpoint
  - No authentication required
  - CORS enabled for browser-based clients
  - Returns only username, display_name, address, address_verified
- **2025-02:** Updated `/api/directory` response format
  - Renamed `name` to `username`
  - Added `authenticated_links` and `unauthenticated_links` arrays
  - Removed `id`, `exists`, `verified_links_count` fields
  - Simplified ranking to 2 tiers (username-based only)
- **2025-02:** Unified `/api/directory` endpoint replaces `/api/search`
  - Added `verified_only` filter
  - Added cursor-based pagination
  - All endpoints require API key
