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

## OAuth Flow

```
User clicks "Not Authenticated" badge
    -> connect.ts: stores the challenged profileId + linkId in sessionStorage
    -> supabase.auth.signInWithOAuth() redirects to provider
    -> User authorizes
    -> Provider redirects back and Supabase establishes a temporary session
    -> useConnectCallback.ts: sends profileId + linkId + access token to the server
    -> verifyLink.ts: loads that exact existing row, validates the token with getUser(),
       compares the provider identity with the stored URL, and changes only is_verified
    -> Callback clears pending state and the local Supabase session
    -> Link badge updates to green
```

## Verification Invariant

OAuth proves control of one social account; it does not authorize profile edits. The server
must bind the proof to the exact existing `zcasher_links` row selected before the redirect.

The verification action may only change `is_verified` from `false` to `true`. It must never
insert a link, find another row by platform, replace a URL or label, change a platform, or
update the profile/avatar. Browser `sessionStorage` is untrusted correlation state; the
database row supplies the authoritative URL, platform, ownership, and current status.

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
| `providers.ts` | Provider configs and strict stored-URL identity extraction |
| `connect.ts` | Initiates OAuth and stores the challenged `profileId` + `linkId` |
| `useConnectCallback.ts` | Processes one pending OAuth result and clears the temporary local session |
| `verifyLink.ts` | Validates the OAuth identity against one exact existing row and conditionally flips `is_verified` |

## Database

| Table | Access |
|-------|--------|
| `zcasher_links` | Read exact challenged row; Write only `is_verified=true` on that same row |
| `zcasher` | Read — check `address_verified` |

## See Also
- `ui/profile/AGENT.md` — profile card where auth badges appear and clicks originate
- `lib/verification/AGENT.md` — ZVS address verification (prerequisite for link auth)
- `lib/profile/AGENT.md` — profile and stored-link data model
