# /ui/links - Social Link Authentication (OAuth)

## Purpose
OAuth-based social link verification. Users connect social accounts (X, GitHub, Discord,
LinkedIn) to prove ownership. Requires ZVS address verification first — only wallet-verified
profiles can authenticate links.

## What the User Sees

### Authenticating a Link
1. User clicks the gray "Not Authenticated" badge on a social link in their profile card
2. Browser redirects to the provider's OAuth consent screen (via Supabase Auth)
3. User authorizes on the provider
4. Browser returns to the profile page
5. The link badge turns green ("Authenticated") — persisted immediately, no OTP required

### Prerequisites
- Profile must have `address_verified = true` (enforced server-side in `verifyLink.ts`)
- The link URL must match a supported provider (X, GitHub, Discord, or LinkedIn)

### Avatar Auto-Import
When a link is authenticated and the profile has no avatar, the OAuth avatar is automatically
downloaded and stored in the Supabase bucket. Supported for X, GitHub, and Discord (LinkedIn
has no avatar extraction).

## OAuth Flow

```
User clicks "Not Authenticated" badge
    -> connect.ts: connectSocial() stores pending state in sessionStorage
    -> supabase.auth.signInWithOAuth() redirects to provider
    -> User authorizes
    -> Provider redirects back with auth code
    -> Supabase exchanges for token, creates session
    -> useConnectCallback.ts: detects auth state change
    -> Extracts handle from session.user.identities[]
    -> Builds canonical URL from handle
    -> verifyLink.ts (server action): validates token, checks handle matches,
       checks address_verified, upserts zcasher_links with is_verified=true
    -> Link badge updates to green
```

## Supported Providers

| Provider | Key | Handle Source | Profile URL |
|----------|-----|---------------|-------------|
| X / Twitter | `twitter` | `username` / `screen_name` | `https://x.com/{handle}` |
| GitHub | `github` | `user_name` | `https://github.com/{handle}` |
| Discord | `discord` | numeric `id` | `https://discord.com/users/{id}` |
| LinkedIn | `linkedin_oidc` | `vanityName` | `https://linkedin.com/in/{handle}` |

## File -> Feature Map

| File | Feature |
|------|---------|
| `providers.ts` | Provider configs: handle extraction, URL building, avatar URLs, `detectProviderFromUrl()`, `extractHandleFromUrl()` |
| `connect.ts` | Initiates OAuth via `supabase.auth.signInWithOAuth()`, stores pending state in sessionStorage |
| `useConnectCallback.ts` | Client hook: listens for `onAuthStateChange`, extracts identity, calls `onConnected()` callback |
| `verifyLink.ts` | Server action: validates OAuth token, checks handle match, enforces address verification, upserts link with `is_verified=true` |

## Database

| Table | Access |
|-------|--------|
| `zcasher_links` | Write — upsert with `is_verified=true`, `platform` column |
| `zcasher` | Read — check `address_verified`; Write — `profile_image_url` if avatar auto-imported |

## See Also
- `ui/profile/AGENT.md` — profile card where auth badges appear and clicks originate
- `lib/verification/AGENT.md` — ZVS address verification (prerequisite for link auth)
- `lib/profile/AGENT.md` — avatar storage used for OAuth avatar import
