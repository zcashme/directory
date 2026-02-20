# /ui/links - Social OAuth Verification

## Purpose
OAuth-based social link verification. Users connect social accounts (X, GitHub, Discord, LinkedIn)
to prove ownership. **Requires ZVS address verification first** - only wallet-verified profiles
can verify social links.

## Prerequisite: ZVS Verification
Before connecting social accounts, users must verify their Zcash address via ZVS (wallet signing).
This ensures only legitimate profile owners can claim social identities.

See `/lib/verification/AGENT.md` for the ZVS flow.

## OAuth Flow

### 1. Initiation
User clicks the gray "Not Authenticated" badge on a social link in the **profile card front**.

```typescript
import { connectSocial } from "./connect";

await connectSocial("twitter", {
  profileId: 123,
  returnPath: window.location.pathname
});
// → Redirects to X OAuth consent screen
// → On success, returns to same page
```

### 2. Callback Handling
After OAuth redirect, `ProfileCard` handles the callback via `useConnectCallback`.

```typescript
import { useConnectCallback } from "./useConnectCallback";

useConnectCallback({
  profileId: 123,
  onConnected: async (link) => {
    // link = { url, provider, handle, username, avatarUrl }
    // Immediately persist via upsertVerifiedLink server action
    await upsertVerifiedLink(profileId, link.url);
    // Update local state + router.refresh()
  },
  onError: (error) => console.error(error)
});
```

### 3. Persistence
Verified links are persisted immediately on OAuth callback via `upsertVerifiedLink` server action — no OTP save required.

## Key Files

| File | Purpose |
|------|---------|
| `providers.ts` | Provider configs, handle extraction, URL building, `detectProviderFromUrl`, `extractHandleFromUrl` |
| `connect.ts` | Initiates OAuth via Supabase |
| `useConnectCallback.ts` | Client hook for handling OAuth redirect (consumed by `ProfileCard`) |
| `verifyLink.ts` | Server action: validates OAuth identity server-side, upserts verified link with `platform` column |

## Supported Providers

| Provider | Key | Handle Source | Profile URL |
|----------|-----|---------------|-------------|
| X / Twitter | `twitter` | `username`, `screen_name` | `https://x.com/{handle}` |
| GitHub | `github` | `login` | `https://github.com/{handle}` |
| Discord | `discord` | `id` | `https://discord.com/users/{id}` |
| LinkedIn | `linkedin_oidc` | `vanityName` | `https://linkedin.com/in/{handle}` |

## Provider Configuration

```typescript
import { PROVIDERS, getProviderByKey, detectProviderFromUrl, extractHandleFromUrl } from "./providers";

const twitter = PROVIDERS.twitter;
twitter.getHandle(identityData);    // Extract handle from OAuth response
twitter.buildUrl(handle);           // Build profile URL
twitter.getAvatarUrl?.(identityData); // Extract avatar (optional)
twitter.getUsername?.(identityData);  // Extract display name (optional)

detectProviderFromUrl(url);         // URL → provider key (e.g. "twitter")
extractHandleFromUrl(url);          // URL → handle string
```

## Avatar Fetching ("Use Avatar" button)

Avatar fetching is handled inline in `ProfileEditor` via public APIs — no OAuth session required:
- **GitHub**: `https://github.com/{handle}.png`
- **X / Twitter**: `https://unavatar.io/x/{handle}`
- **Discord / LinkedIn**: Not supported (no public avatar API)

The button appears on verified links in the profile editor. It extracts the handle from
the link URL and sets `profile_image_url` directly.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  PREREQUISITE: ZVS Address Verification (wallet signing)   │
│  User must have zcasher.verified = true                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. INITIATE (from ProfileCard front)                       │
│     User clicks gray "Not Authenticated" badge on a link    │
│     → detectProviderFromUrl(link.url) → provider key        │
│     → connectSocial(provider, { profileId, returnPath })    │
│     → supabase.auth.signInWithOAuth()                       │
│     → Redirect to provider consent screen                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. USER AUTHORIZES                                         │
│     User grants permission on provider                      │
│     → Provider redirects back with auth code                │
│     → Supabase exchanges for token, creates session         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. CALLBACK (in ProfileCard)                               │
│     useConnectCallback() detects auth state change          │
│     → Find provider identity in session.user.identities[]  │
│     → provider.getHandle(identity_data) → handle            │
│     → provider.buildUrl(handle) → canonical URL             │
│     → onConnected({ url, provider, handle, ... })           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. PERSIST IMMEDIATELY                                     │
│     → upsertVerifiedLink(profileId, url) server action      │
│     → INSERT/UPDATE zcasher_links SET is_verified = true,   │
│       platform = derived from provider key                  │
│     → Update local linksArray state                         │
│     → router.refresh() to sync server state                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
zcasher_links {
  id           SERIAL PRIMARY KEY
  zcasher_id   INTEGER REFERENCES zcasher(id)
  url          TEXT NOT NULL
  platform     TEXT  -- "X", "GitHub", "Discord", "LinkedIn", "Other"
  is_verified  BOOLEAN DEFAULT false
  label        TEXT  -- optional, used for Discord usernames
  created_at   TIMESTAMP
  updated_at   TIMESTAMP
}
```

## Security Notes

- **Wallet-Profile Verification Required**: Server checks `profile.address_verified` before allowing link verification
- **OAuth via Supabase**: Token exchange handled by Supabase Auth, no tokens stored in app
- **Identity Extraction**: Handle extracted from `session.user.identities[]` after OAuth
- **No Client Trust**: Link verification always validated server-side, never trust client claims

## Adding a New Provider

1. Add config to `PROVIDERS` in `providers.ts`:
   ```typescript
   mastodon: {
     key: "mastodon",
     label: "Mastodon",
     buildUrl: (handle) => `https://mastodon.social/@${handle}`,
     getHandle: (data) => (data?.username as string) || null,
   }
   ```

2. Enable provider in Supabase Auth dashboard

3. Update `detectProviderFromUrl` in `providers.ts` to match the new provider's URLs

4. Optionally add avatar support in `ProfileEditor.fetchAvatarUrl()` if a public avatar API exists
