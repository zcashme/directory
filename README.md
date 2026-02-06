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

The endpoint is public in this repo. No API key is required. If you add auth or rate limits
at the deployment layer, document them here.

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

