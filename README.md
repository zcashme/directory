# Zcash Address Directory – Frontend

A React + Vite web application that serves as the **frontend for the Zcash Address Directory**.  
This project provides a simple, fast, and modern interface for browsing and interacting with Zcash addresses.

---

## 🚀 Tech Stack

- [React](https://reactjs.org/) – UI library  
- [Vite](https://vitejs.dev/) – build tool and dev server  
- [JavaScript / JSX](https://developer.mozilla.org/en-US/docs/Web/JavaScript)  

---

## 📦 Installation

Clone the repository and install dependencies:

```powershell
git clone https://github.com/ZcashUsersGroup/zcashme
cd zcashme
npm install
````

---

## 🛠 Development

Start the local development server:

```powershell
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📑 Build for Production

```powershell
npm run build
```

The compiled output will be in the `dist/` directory.

---

## 📂 Project Structure

```
zcashme/
├── public/          # Static assets
├── src/             # React components, pages, and styles
├── index.html       # Entry point
├── vite.config.js   # Vite configuration
├── package.json     # Dependencies and scripts
```

---

## 🤝 Contributing

## Social Links

Social links flow through three stages that share the same handle normalization rules.
Known platforms use `normalizeSocialUsername` (quotes/backslashes stripped, whitespace trimmed,
platform URL prefixes removed). Discord remains special-cased (IDs/labels).

- AddUserForm: link inserts set `zcasher_links.label` to the normalized handle for known platforms (except Discord).
- ProfileEditor: edits are staged in `pending_zcasher_edits.links` until OTP confirmation.
- Supabase OTP: `confirm_otp_sql` applies link edits/inserts and uses `public.extract_label(url)` to set `zcasher_links.label`.
- ProfileCard display: uses `getSocialHandle` (via `linkUtils`) to render handles from URLs.

To keep labels consistent everywhere, align `public.extract_label` with the same normalization
rules used in the frontend.

---

## API

All API endpoints require an `X-API-Key` header that matches the server's `API_KEY`
environment variable.

For wallet integration details, see `WALLET_API_README.md`.

### GET /api/resolve/:username

Lookup a directory username and return the profile's address, verification status,
last verification timestamp, and link lists split by verification.

Source of truth: This documentation is derived from the implementation in
`app/api/resolve/[username]/route.js`. If anything here conflicts with the code, the code wins.

#### Quickstart

Local dev:
- `http://localhost:3000/api/resolve/cobra`

Production:
- Use your deployed domain and the same path.

#### Inputs and normalization

- `:username` is matched against `public.zcasher.name` (case-insensitive).
- The value is URL-decoded and trimmed; no other normalization is applied.

#### Status codes and errors

- 200: profile found
- 400: invalid or missing username
- 404: profile not found
- 500: server-side lookup failures

Success response (200):

```
{
  "username": "cobra",
  "display_name": "Cobra",
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

Error responses:

```
{ "error": "invalid_username", "username": null }
{ "error": "not_found", "username": "cobra" }
{ "error": "profile_lookup_failed", "username": "cobra" }
{ "error": "links_lookup_failed", "username": "cobra" }
```

#### Auth and rate limits

The endpoint requires `X-API-Key` and is rate limited (60 requests per minute per IP).
Responses are cached with `Cache-Control: s-maxage=60`.

### GET /api/directory

Search the directory by username or linked handles/domains and return matching profiles
with address and link metadata.

Source of truth: This documentation is derived from the implementation in
`app/api/directory/route.js`. If anything here conflicts with the code, the code wins.

#### Query parameters

- `q` (optional): search term. Matches `public.zcasher.name` (case-insensitive),
  `zcasher_links.label` (handles), and non-social link domains from `zcasher_links.url`.
- `limit` (optional): number of results to return. Default `25`, max `100`.
- `cursor` (optional): opaque pagination cursor returned by the API.
- `verified_only` (optional): when `true`, only returns profiles with
  `address_verified = true` **or** at least one verified link.

#### Quickstart

Local dev:
- `http://localhost:3000/api/directory?q=cobra`
- `http://localhost:3000/api/directory?q=cobracrypto`
- `http://localhost:3000/api/directory?q=jamespersonal`
- `http://localhost:3000/api/directory?verified_only=true`

#### Status codes and errors

- 200: results returned (possibly empty)
- 400: invalid parameters
- 500: server-side lookup failures

Success response (200):

```
{
  "results": [
    {
      "username": "cobra",
      "display_name": "Cobra",
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

Error responses:

```
{ "error": "profile_lookup_failed" }
{ "error": "links_lookup_failed" }
{ "error": "search_failed" }
```

#### Pagination

Use the `next_cursor` value from the previous response to fetch the next page:

```
GET /api/directory?q=cobra&limit=25&cursor=eyJuYW1lIjoiY29icmEiLCJpZCI6MX0
```

#### Wallet integration (example)

All wallet requests must include `X-API-Key`. Treat `next_cursor` as an opaque token.

JavaScript (fetch):
```
const API_KEY = "YOUR_KEY";
const BASE = "https://your-domain.com";

async function searchDirectory(q, cursor = null) {
  const params = new URLSearchParams({ q, limit: "25" });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${BASE}/api/directory?${params.toString()}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { results, next_cursor }
}

async function resolveUsername(username) {
  const res = await fetch(`${BASE}/api/resolve/${encodeURIComponent(username)}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { username, display_name, address, ... }
}
```

#### Ranking behavior

Results are prioritized to mimic the directory search UI:

1) Usernames that **start with** the query
2) Link handles or non-social domains that **start with** the query
3) Usernames that **include** the query
4) Link handles or non-social domains that **include** the query

The query is normalized by stripping any leading scheme/host (e.g., `https://x.com/`).
Social link handles are extracted by domain and path (e.g., `linkedin.com/in/{handle}`).
Non-social links are matched by domain (e.g., `www.example.com` matches `example.com`).

#### Auth and rate limits

The endpoint requires `X-API-Key` and is rate limited (60 requests per minute per IP).
Responses are cached with `Cache-Control: s-maxage=30`.

### GET /api/social/:platform/:handle

Lookup a social handle (e.g., X/Twitter) and return the associated Zcash address **only if** the
matched link is verified.

Source of truth: This documentation is derived from the implementation in
`app/api/social/[platform]/[handle]/route.js` and `lib/social-lookup.js`. If anything here conflicts
with the code, the code wins.

#### Quickstart

Local dev:
- `http://localhost:3000/api/social/x/thefrankbraun`

Production:
- Use your deployed domain and the same path.

#### Inputs and normalization

The `:platform` and `:handle` are normalized in code:
- `:platform` must be one of the supported platforms defined in `lib/social-lookup.js`
  (aliases like `twitter` map to `x`).
- `:handle` is normalized with `normalizeSocialUsername` in `src/utils/normalizeSocialLink.js`.
  It accepts `@handle`, full URLs, and mixed-case input; it strips protocol, known hosts,
  leading `@`, and common path prefixes.

#### Caching

Responses include `Cache-Control: s-maxage=300` from `app/api/social/[platform]/[handle]/route.js`.

#### Status codes and errors

- 200: verified link found and address returned
- 400: invalid or unsupported request
- 404: not found or not verified
- 500: server-side lookup failures

Success response (200):

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

Error responses:

```
{ "address": null, "handle": null, "error": "unsupported_platform" }
{ "address": null, "handle": null, "error": "invalid_handle" }
{ "address": null, "handle": "thefrankbraun", "error": "not_found" }
{ "address": null, "handle": "thefrankbraun", "error": "not_verified" }
{ "address": null, "handle": "thefrankbraun", "error": "lookup_failed" }
{ "address": null, "handle": "thefrankbraun", "error": "profile_lookup_failed" }
```

Notes:
- `not_verified` means matching links exist, but none are verified, so no address is returned.
- Supported platforms are defined in `lib/social-lookup.js`.

#### Examples

Verified handle (200):
```
curl "http://localhost:3000/api/social/x/tonymargarit"
```

Unverified handle (404 + not_verified):
```
curl "http://localhost:3000/api/social/x/someunverifiedhandle"
```

Not found (404 + not_found):
```
curl "http://localhost:3000/api/social/x/doesnotexist"
```

#### Auth and rate limits

The endpoint requires `X-API-Key` and is rate limited (60 requests per minute per IP).
Responses are cached with `Cache-Control: s-maxage=300`.

---

Pull requests are welcome!
For major changes, please open an issue first to discuss what you’d like to change.

---

## 📜 License

MIT License © 2025 Zcash Users Group

---

## Backend (ZVS) Deployment Note

The Zcash Verification Service backend is deployed separately on an Azure VM and is not part of this frontend repo.
Local development uses a NEXT_PUBLIC_VERIFY_API_URL env var to point at the VM API, and the Vercel project is configured
with the same variable for production.

