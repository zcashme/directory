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

If you exceed the rate limit, you will receive `429 rate_limited`.

---

## Endpoints

### 1) Directory Search

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

### 2) Resolve Username

```
GET /api/resolve?username=<username>
```

Use this to get full profile details for a specific user.

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

### HTTP status codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `invalid_username`, `missing_parameters` | Bad request |
| 401 | `unauthorized` | API key missing or invalid |
| 404 | `not_found` | Username or handle not found |
| 429 | `rate_limited` | Too many requests |
| 500 | `search_failed`, `links_lookup_failed`, `server_misconfigured` | Server error |

### Error response format

```json
{ "error": "not_found", "username": "nonexistent" }
{ "error": "rate_limited" }
{ "error": "unsupported_platform", "handle": null }
```

---

## Integration examples

### Minimal integration flow

1. User types a search term -> call `/api/directory?q=...`
2. Show results (username + display name + verified badge)
3. On selection, call `/api/resolve/:username` to get the address
4. Optionally, allow direct social lookup with `/api/social?platform=...&handle=...`

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
    const res = await fetch(`https://zcash.me/api/resolve?username=${parsed.username}`, {
      headers: { 'X-API-Key': 'YOUR_KEY' }
    });
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

### Directory browser

```javascript
async function* browseDirectory(verifiedOnly = true) {
  let cursor = null;

  while (true) {
    const url = new URL('https://zcash.me/api/directory');
    url.searchParams.set('limit', '100');
    url.searchParams.set('verified_only', verifiedOnly);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, {
      headers: { 'X-API-Key': 'YOUR_KEY' }
    });
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
2. **Start searching after 1-2 characters** to reduce noise
3. **Show verified badge** when `address_verified` is true or a verified link exists
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

- **2025-02:** Updated `/api/directory` response format
  - Renamed `name` to `username`
  - Added `authenticated_links` and `unauthenticated_links` arrays
  - Removed `id`, `exists`, `verified_links_count` fields
  - Simplified ranking to 2 tiers (username-based only)
- **2025-02:** Unified `/api/directory` endpoint replaces `/api/search`
  - Added `verified_only` filter
  - Added cursor-based pagination
  - All endpoints require API key
