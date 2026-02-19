# /lib - Core Business Logic

## Purpose
Shared server-side logic, data fetching, server actions, types, and utilities.
This is the brain of zcash.me - all business logic lives here.

## Directory Structure

| Folder | Purpose |
|--------|---------|
| `/zcash` | Zcash address validation, URI building, memo encoding |
| `/profile` | Profile types, fetching, username policies, link handling |
| `/directory` | Search, city filtering, featured profiles |
| `/verification` | OTP confirmation, link verification |
| `/signup` | Profile creation server actions |
| `/swap` | OneClick SDK integration, token types |
| `/profile/urlValidation.ts` | URL validation (isValidUrl, normalizeUrl) |
| `/leaderboard` | Referral commission calculations |
| `/thread` | Discussion board actions |
| `/supabase` | Database client initialization |
| `/api` | Rate limiting, API guards |

## Key Exports

### Server Actions
- `createProfileAction` - Create new profile
- `confirmOtpAction` - Verify OTP from transaction memo
- `updateLinkVerificationAction` - Mark links verified
- `getLeaderboardAction` - Fetch referral rankings

### Utilities
- `validateZcashAddress()` - Full validation with type detection
- `buildZcashUri()` - Construct zcash: payment URIs
- `isValidUrl()` - URL validation with security checks

## Zcash Address Types Supported
- **Unified (u1...)** - Recommended, privacy-preserving
- **Sapling (zs1...)** - Shielded pool
- **Transparent (t1.../t3...)** - Public (shown with warnings)
- **TEX (tex1...)** - Discouraged

## Testing Harness
- No unit tests currently
- Server actions can be tested via API routes
- URL validation is a pure function - easy to unit test

## Database Access
All DB queries go through Supabase client in `/lib/supabase/`.
Main tables: `zcasher`, `zcasher_links`, `zcasher_searchable`

## Adding New Logic
1. Create folder for feature domain
2. Add `types.ts` for interfaces
3. Add `actions.ts` for server actions (use 'use server')
4. Export from `index.ts`
