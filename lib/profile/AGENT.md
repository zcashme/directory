# /lib/profile - Profile Data & Business Logic

## Purpose
Server-side profile types, fetching, validation, link enrichment, and avatar storage.
Powers the profile page (zcash.me/:username) and appears in search, directory, and leaderboard views.

## What the User Experiences

### Viewing a Profile
When someone visits zcash.me/:username, the server fetches the profile from `zcasher_searchable`,
joins rank data from the leaderboard tables, and fetches the user's links. The profile slug
supports three lookup strategies: exact slug match, username-discriminator pattern (e.g. `zooko-132`
for unverified profiles), and normalized username fallback.

### Usernames & Slugs
Verified profiles get a clean slug (`/zooko`). Unverified profiles get a discriminator suffix
(`/zooko-132`). Username input is sanitized (NFKC normalize, lowercase, spaces to underscores,
non-alphanumeric stripped). Social usernames are normalized per-platform (strip @, remove host
prefixes, extract first path segment).

### Links
Each profile has social links stored in `zcasher_links`. Links are enriched client-side with
platform-specific favicons (29 platforms supported), human-readable labels, and extracted handles.
Platform detection maps URLs to canonical provider names (X, GitHub, Discord, LinkedIn, etc.).

### URL Validation
Profile links must be HTTPS. Blocked: localhost, IP addresses, and 12 link shorteners
(t.co, bit.ly, tinyurl.com, etc.). Tracking parameters (utm_*, fbclid, gclid) trigger warnings.

### Avatar Storage
Avatars are stored in Supabase storage (`zcashme` bucket, `avatars/` folder). External URLs
(from OAuth providers) are downloaded server-side and re-uploaded. Max 2 MB, JPG/PNG only.
Path format: `avatars/{profileId}_zmp.png`.

### Trust & Warnings
Profiles have a computed trust state: verified address, verified link count, and whether they
can authenticate links. Warning banners (red/yellow/green/neutral) appear on the profile card
based on verification status, duplicate usernames, and link counts.

## Database

| Table | Access |
|-------|--------|
| `zcasher_searchable` | Read — profile fetching, username availability, profile count |
| `zcasher_links` | Read — links for profile display and batch fetching |
| `referrer_ranked_alltime` | Read — leaderboard rank joined to profile |
| `referrer_ranked_weekly` | Read — weekly rank |
| `referrer_ranked_monthly` | Read — monthly rank |

## File -> Feature Map

| File | Feature |
|------|---------|
| `types.ts` | Core interfaces: `Profile`, `ProfileLink`, `EnrichedProfileLink`, `ProfileTrust`, `ProfileTrustWarning` |
| `profileFetcher.ts` | `fetchProfileForSlug()` — cached server function, slug lookup with fallbacks, rank + link joins |
| `profileQueries.ts` | `getProfileCount()`, `getUsernameAvailability()`, `getDuplicateNameCount()` |
| `profileUtils.ts` | Trust/warning state (`getProfileTrust`, `getWarningConfig`), slug building, share URLs, last-verified labels |
| `profileLinks.ts` | Link enrichment: 24-domain favicon map, platform detection, handle extraction, `enrichLink()` |
| `usernamePolicy.ts` | Username sanitization and normalization for comparison/slugs |
| `usernameNormalizer.ts` | Social username extraction per platform (X, GitHub, Instagram, etc.) and canonical URL building |
| `urlValidation.ts` | HTTPS enforcement, shortener blocking, tracking param warnings |
| `avatarStorage.ts` | Supabase storage upload/download, external URL fetch, size/type validation |
| `getProfileLinksBatchAction.ts` | Server action: batch-fetch links by profile IDs (used by NS directory) |
| `assets/favicons/` | 29 platform favicon PNGs |

## See Also
- `ui/profile/AGENT.md` — profile card, editor, and display components
- `lib/signup/AGENT.md` — profile creation flow
- `lib/verification/AGENT.md` — address verification and profile edit persistence
