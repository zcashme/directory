# /lib/supabase - Database Client

## Purpose
Supabase client initialization. Single source of truth for all database and storage access.

## Clients

**Server** (`supabase-server.ts`): `createSupabaseServerClient()` returns `SupabaseClient | null`.
Prefers service role key (bypasses RLS), falls back to anon key. Sessions not persisted
(`persistSession: false`) for stateless serverless operations.

**Client** (`supabase-client.ts`): Singleton `supabase` export using anon key. Respects RLS.

## Key Tables

| Table | Purpose |
|-------|---------|
| `zcasher` | Profile records (id, name, slug, address, address_verified, bio, profile_image_url, etc.) |
| `zcasher_links` | Profile social links (url, platform, is_verified, label) |
| `zcasher_searchable` | Denormalized view for fast search/directory queries |
| `zcasher_verifications` | Append-only verification event log (reward snapshots) |
| `referrer_ranked_alltime/weekly/monthly` | Pre-computed leaderboard rankings (materialized views) |

## Avatar Storage

All profile images live in Supabase storage bucket `zcashme`, folder `avatars/`.
Canonical path: `avatars/{profileId}_zmp.png`. `profile_image_url` is always a Supabase
public storage URL, never an external URL. External OAuth avatars are downloaded and
re-uploaded. See `lib/profile/avatarStorage.ts`.

## File -> Feature Map

| File | Feature |
|------|---------|
| `supabase-server.ts` | `createSupabaseServerClient()` — server-side client with service key |
| `supabase-client.ts` | Singleton `supabase` export — browser-side client with anon key |
