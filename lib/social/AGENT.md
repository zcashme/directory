# /lib/social - Social OAuth Verification

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
User clicks "Connect X" button in profile editor.

```typescript
import { connectSocial } from "./connect";

await connectSocial("twitter", {
  profileId: 123,
  returnPath: "/profile/edit"
});
// → Redirects to X OAuth consent screen
// → On success, returns to: /profile/edit?connect=twitter&pid=123
```

### 2. Callback Handling
After OAuth redirect, extract identity from Supabase session.

```typescript
import { useConnectCallback } from "./useConnectCallback";

useConnectCallback({
  profileId: 123,
  onConnected: (link) => {
    // link = { url, provider, handle, username, avatarUrl }
    // Add to local form state (NOT persisted yet)
  },
  onError: (error) => console.error(error)
});
```

### 3. Persistence
When user saves profile, verified links are written to database.

```typescript
import { verifyLinkAction } from "./verifyLinkAction";

const result = await verifyLinkAction(profileId, "https://x.com/handle");
// Server checks: profile.verified === true (ZVS completed)
// Then: upserts to zcasher_links with is_verified = true
```

## Key Files

| File | Purpose |
|------|---------|
| `providers.ts` | Provider configs (handle extraction, URL building) |
| `connect.ts` | Initiates OAuth via Supabase |
| `useConnectCallback.ts` | Client hook for handling OAuth redirect |
| `verifyLinkAction.ts` | Server action to persist verified link |
| `verifyLink.ts` | Database upsert operations |
| `avatars.ts` | Avatar URL utilities |
| `utils.ts` | Shared helpers |

## Supported Providers

| Provider | Key | Handle Source | Profile URL |
|----------|-----|---------------|-------------|
| X / Twitter | `twitter` | `username`, `screen_name` | `https://x.com/{handle}` |
| GitHub | `github` | `login` | `https://github.com/{handle}` |
| Discord | `discord` | `id` | `https://discord.com/users/{id}` |
| LinkedIn | `linkedin_oidc` | `vanityName` | `https://linkedin.com/in/{handle}` |

## Provider Configuration

```typescript
import { PROVIDERS, getProviderByKey } from "./providers";

const twitter = PROVIDERS.twitter;
twitter.getHandle(identityData);    // Extract handle from OAuth response
twitter.buildUrl(handle);           // Build profile URL
twitter.getAvatarUrl?.(identityData); // Extract avatar (optional)
twitter.getUsername?.(identityData);  // Extract display name (optional)
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  PREREQUISITE: ZVS Address Verification (wallet signing)   │
│  User must have zcasher.verified = true                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. INITIATE                                                │
│     connectSocial("twitter", { profileId, returnPath })     │
│     → supabase.auth.signInWithOAuth()                       │
│     → Redirect to X consent screen                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. USER AUTHORIZES                                         │
│     User grants permission on X                             │
│     → X redirects back with auth code                       │
│     → Supabase exchanges for token, creates session         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. CALLBACK                                                │
│     URL: /profile/edit?connect=twitter&pid=123              │
│     useConnectCallback() detects params                     │
│     → getSession() from Supabase                            │
│     → Find twitter identity in session.user.identities[]   │
│     → provider.getHandle(identity_data) → "@handle"         │
│     → provider.buildUrl(handle) → "https://x.com/handle"    │
│     → onConnected({ url, provider, handle, ... })           │
│     → Clean URL (remove ?connect&pid)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. LOCAL STATE                                             │
│     Link added to form.links[] in React state               │
│     NOT persisted to database yet                           │
│     User continues editing profile                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. SAVE PROFILE                                            │
│     verifyLinkAction(profileId, url)                        │
│     → Server checks: profile.verified === true              │
│     → upsertVerifiedLink(profileId, url)                    │
│     → INSERT/UPDATE zcasher_links SET is_verified = true    │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
zcasher_links {
  id           SERIAL PRIMARY KEY
  zcasher_id   INTEGER REFERENCES zcasher(id)
  url          TEXT NOT NULL
  is_verified  BOOLEAN DEFAULT false
  label        TEXT  -- optional, used for Discord usernames
  created_at   TIMESTAMP
  updated_at   TIMESTAMP
}
```

## Security Notes

- **ZVS Required**: `verifyLinkAction` checks `profile.verified` server-side before allowing link verification
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

3. Update UI to show new provider button in profile editor
