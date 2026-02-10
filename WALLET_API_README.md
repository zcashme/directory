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

All API requests **require** an API key:

```
X-API-Key: YOUR_KEY
```

If the key is missing or invalid, the API returns `401 unauthorized`.

To obtain an API key for your wallet, contact the Zcash.me team.

## Rate limits and caching

| Endpoint | Cache TTL | Rate Limit |
|----------|-----------|------------|
| `/api/directory` | 30 seconds | 60/min |
| `/api/resolve` | 60 seconds | 60/min |
| `/api/social` | 300 seconds | 60/min |

If you exceed the rate limit, you will receive `429 rate_limited` with a `Retry-After` header.

---

## Endpoints

### 1) Directory Search & Browse

```
GET /api/directory
```

Use this endpoint to:
- Power autocomplete/search as users type
- Browse the full directory (paginated)
- Filter to verified users only

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query (optional). Omit to browse all profiles. |
| `limit` | integer | 25 | Results per page (1-100) |
| `cursor` | string | - | Pagination cursor from previous response |
| `verified_only` | boolean | false | Only return profiles with verified addresses |

#### Search behavior

When `q` is provided:
- Matches usernames starting with the query (case-insensitive)
- Matches display names starting with the query
- Matches social handles/links containing the query

#### Examples

**Search for users:**
```
GET /api/directory?q=cobra&limit=10
```

**Browse all verified users:**
```
GET /api/directory?verified_only=true&limit=50
```

**Browse full directory (paginated):**
```
GET /api/directory?limit=100
GET /api/directory?limit=100&cursor=eyJpZCI6MTAwLCJuYW1lIjoiem9ybyJ9
```

#### Response

```json
{
  "results": [
    {
      "id": 1,
      "name": "cobra",
      "display_name": "Cobra",
      "address": "u1abc123...",
      "address_verified": true,
      "profile_image_url": "https://example.com/avatar.jpg",
      "bio": "Zcash enthusiast and builder.",
      "nearest_city_name": "Denver",
      "verified_at": "2025-10-23T10:58:54.721199+00:00",
      "verified_links_count": 2
    }
  ],
  "exists": false,
  "next_cursor": "eyJpZCI6MjUsIm5hbWUiOiJ6ZWtlIn0"
}
```

#### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | array | Array of profile objects |
| `exists` | boolean | True if exact username match exists (for availability checks) |
| `next_cursor` | string \| null | Cursor for next page, null if no more results |

#### Profile object fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique profile ID |
| `name` | string | Username (URL slug) |
| `display_name` | string \| null | Display name |
| `address` | string \| null | Zcash address |
| `address_verified` | boolean | True if address is verified on-chain |
| `profile_image_url` | string \| null | Avatar URL |
| `bio` | string \| null | Profile bio |
| `nearest_city_name` | string \| null | Location |
| `verified_at` | string \| null | ISO timestamp of last verification |
| `verified_links_count` | integer | Number of verified social links |

---

### 2) Resolve Username

```
GET /api/resolve?username=<username>
```

Use this to get full profile details including all social links.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | The username to resolve |

#### Example

```
GET /api/resolve?username=cobra
```

#### Response

```json
{
  "username": "cobra",
  "display_name": "Cobra",
  "profile_image_url": "https://example.com/avatar.jpg",
  "bio": "Zcash enthusiast and builder.",
  "nearest_city_name": "Denver",
  "address": "u1abc123...",
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

#### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Username |
| `display_name` | string \| null | Display name |
| `profile_image_url` | string \| null | Avatar URL |
| `bio` | string \| null | Profile bio |
| `nearest_city_name` | string \| null | Location |
| `address` | string \| null | Zcash address |
| `address_verified` | boolean | True if address verified on-chain |
| `verified_at` | string \| null | ISO timestamp of last verification |
| `authenticated_links` | array | Links that have been verified |
| `unauthenticated_links` | array | Links that have not been verified |

---

### 3) Resolve Social Handle

```
GET /api/social?platform=<platform>&handle=<handle>
```

Use this to find a Zcash address from a social media handle.

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
  "address": "u1abc123...",
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
{ "results": [...], "next_cursor": "eyJpZCI6MTAwLCJuYW1lIjoiem9ybyJ9" }

# Next page
GET /api/directory?limit=100&cursor=eyJpZCI6MTAwLCJuYW1lIjoiem9ybyJ9
```

**Important:** Treat the cursor as an opaque token. Do not parse or modify it.

---

## Error handling

### HTTP status codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `invalid_username`, `missing_parameters` | Bad request |
| 401 | `unauthorized` | API key missing or invalid |
| 404 | `not_found` | Username or handle not found |
| 429 | `rate_limited` | Too many requests |
| 500 | `search_failed`, `server_misconfigured` | Server error |

### Error response format

```json
{ "error": "not_found", "username": "nonexistent" }
{ "error": "rate_limited" }
{ "error": "unsupported_platform", "handle": null }
```

---

## Integration examples

### Basic search flow

```javascript
// 1. User types in search box (debounced)
const response = await fetch(`https://zcash.me/api/directory?q=${query}&limit=10`);
const { results } = await response.json();

// 2. User selects a profile
const profile = await fetch(`https://zcash.me/api/resolve?username=${selected.name}`);
const { address } = await profile.json();

// 3. Send ZEC to address
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
    const res = await fetch(`https://zcash.me/api/resolve?username=${parsed.username}`);
    if (!res.ok) throw new Error('User not found');
    const data = await res.json();
    return data.address;
  }
  return parsed.value;
}
```

### Directory browser

```javascript
async function* browseDirectory(verifiedOnly = true) {
  let cursor = null;

  while (true) {
    const url = new URL('https://zcash.me/api/directory');
    url.searchParams.set('limit', '100');
    url.searchParams.set('verified_only', verifiedOnly);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url);
    const { results, next_cursor } = await res.json();

    yield results;

    if (!next_cursor) break;
    cursor = next_cursor;
  }
}

// Usage
for await (const batch of browseDirectory()) {
  displayProfiles(batch);
}
```

---

## UX recommendations

1. **Debounce search input** by 200-300ms to reduce API calls
2. **Start searching after 2+ characters** to reduce noise
3. **Show verified badge** when `address_verified` is true or `verified_links_count > 0`
4. **Cache results** client-side for responsive UX
5. **Handle errors gracefully** with user-friendly messages

---

## Security guidance

- **Backend proxy recommended:** Keep API keys on your backend server when possible
- **Key rotation:** If shipping keys in client apps, plan for rotation
- **HTTPS only:** Always use HTTPS in production
- **Input validation:** Sanitize user input before passing to API

---

## Changelog

- **2025-02:** Unified `/api/directory` endpoint replaces `/api/search`
  - Added `verified_only` filter
  - Added cursor-based pagination
  - Simplified response format (no links in directory results)
  - All endpoints require API key
