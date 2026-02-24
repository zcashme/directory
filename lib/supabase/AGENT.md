# /lib/supabase - Database Client

Supabase client initialization. Single source of truth for all DB and storage access.

## Clients

**Server** (`supabase-server.ts`): `createSupabaseServerClient()` — returns `SupabaseClient | null`. Uses service role key (bypasses RLS), falls back to anon key. Sessions not persisted.

**Client** (`supabase-client.ts`): Singleton `supabase` export using anon key.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      - Project URL (both client/server)
NEXT_PUBLIC_SUPABASE_ANON_KEY - Public anon key (client, server fallback)
SUPABASE_SERVICE_KEY          - Service role key (server only, bypasses RLS)
```

## Tables

### zcasher (Profiles)

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| name | text | Username (normalized) |
| display_name | text | Shown in UI |
| slug | text | URL path |
| address | text | Zcash address |
| address_verified | boolean | |
| bio | text | |
| profile_image_url | text | Always a Supabase bucket URL or null |
| nearest_city_name | text | |
| is_ns | boolean | Network School member |
| featured | boolean | Homepage featured |

### zcasher_links (Profile Links)

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK (serial) |
| zcasher_id | integer | FK → zcasher(id) |
| url | text | Full URL |
| label | text | Display label |
| platform | text | "X", "GitHub", "Discord", etc. |
| is_verified | boolean | Verified via OAuth |

### zcasher_searchable

Denormalized view over zcasher for fast search/directory queries.

## Avatar Storage

All profile images live in the Supabase storage bucket `zcashme`, folder `avatars/`.

- Reads and writes always go through the bucket — `profile_image_url` is always a Supabase public storage URL, never an external URL.
- Canonical path: `avatars/{profileId}_zmp.png`
- Write points: `confirmOtpAction.ts` (primary), `verifyLink.ts` (secondary, only if no existing image)
- External OAuth avatar URLs are downloaded server-side and re-uploaded to the bucket before storing the URL.
- See `lib/profile/avatarStorage.ts` for storage helpers.
