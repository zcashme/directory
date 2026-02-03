# Supabase Security Advisor Fixes

**Date:** 2026-02-02
**Project:** zcashme (fpwrazvgrmatlajjzdiq)

## Summary

Fixed 31 security errors from the Supabase Security Advisor:
- 15 **Security Definer View** errors
- 15 **RLS Disabled in Public** errors
- 1 **Sensitive Columns Exposed** error (verification_codes.otp)

Also fixed 2 **Duplicate Index** performance warnings.

---

## Key Findings

### View Dependency Chain

All 15 views ultimately depend on just 3 base tables:

```
zcasher (already had RLS + public SELECT policy)
zcasher_links (needed RLS + public SELECT policy)
staging_transactions (needed RLS + public SELECT policy)
```

Full dependency tree:
```
growth_over_time           -> zcasher_enriched -> zcasher
growth_over_time_daily     -> zcasher_enriched -> zcasher
growth_over_time_monthly   -> zcasher_enriched -> zcasher
public_profile             -> zcasher_enriched -> zcasher
referrer_ranked_alltime    -> zcasher_enriched -> zcasher
referrer_ranked_daily      -> zcasher_enriched -> zcasher
referrer_ranked_monthly    -> zcasher_enriched -> zcasher
referrer_ranked_weekly     -> zcasher_enriched -> zcasher
staging_tx_full            -> staging_tx_with_profile -> staging_tx_with_zid -> staging_transactions
                           -> zcasher_links
staging_tx_with_profile    -> staging_tx_with_zid -> staging_transactions
                           -> zcasher
staging_tx_with_zid        -> staging_transactions
staging_unified            -> staging_transactions, zcasher, zcasher_links
zcasher_searchable         -> zcasher_links, zcasher_with_referral_rank
zcasher_with_referral_rank -> zcasher, zcasher_links, referrer_ranked_*
```

### Why SECURITY DEFINER was a problem

Views with SECURITY DEFINER run queries as the view owner (postgres), bypassing RLS on underlying tables. This meant anon users could read data through views even if the base tables had no policies allowing it. Switching to SECURITY INVOKER means the querying user's permissions are checked against the base tables.

### Before switching views to SECURITY INVOKER

We had to ensure the base tables had appropriate RLS policies for the `public` role (anon), otherwise all view queries from the frontend would return empty results.

---

## Existing RLS Policies (before our changes)

| table | policy | roles | cmd |
|-------|--------|-------|-----|
| auth_challenges | service_role_access | service_role | ALL |
| auth_challenges | service_role_only | service_role | ALL |
| worldcities | Allow read worldcities | public | SELECT |
| zcasher | create zcasher | public | INSERT |
| zcasher | read zcashers | public | SELECT |

---

## Fix 1: Duplicate Indexes (Performance)

```sql
DROP INDEX IF EXISTS public.zcasher_address_uidx;
DROP INDEX IF EXISTS public.zcasher_slug_idx;
```

Kept the `_key` indexes (from UNIQUE constraints), dropped the manually-created duplicates.

---

## Fix 2: Enable RLS + Public SELECT on View Base Tables

These tables are read by anon users through views and direct frontend queries.

```sql
-- zcasher_links
ALTER TABLE public.zcasher_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.zcasher_links FOR SELECT USING (true);
CREATE POLICY "Allow service role full access" ON public.zcasher_links FOR ALL TO service_role USING (true);

-- staging_transactions
ALTER TABLE public.staging_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.staging_transactions FOR SELECT USING (true);
CREATE POLICY "Allow service role full access" ON public.staging_transactions FOR ALL TO service_role USING (true);
```

---

## Fix 3: Enable RLS on Remaining Tables (Service Role Only)

These tables should not be accessible by anon users. Only service_role gets access.

```sql
ALTER TABLE public.bot_posted_tweets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.bot_posted_tweets FOR ALL TO service_role USING (true);

ALTER TABLE public.refund_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.refund_progress FOR ALL TO service_role USING (true);

ALTER TABLE public.zm_ns_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zm_ns_staging FOR ALL TO service_role USING (true);

ALTER TABLE public.zcasher_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_items FOR ALL TO service_role USING (true);

ALTER TABLE public.zcasher_map_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_map_data FOR ALL TO service_role USING (true);

ALTER TABLE public.transaction_ingest_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.transaction_ingest_log FOR ALL TO service_role USING (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.transactions FOR ALL TO service_role USING (true);

ALTER TABLE public.devtool_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.devtool_logs FOR ALL TO service_role USING (true);

ALTER TABLE public.pending_zcasher_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.pending_zcasher_edits FOR ALL TO service_role USING (true);

ALTER TABLE public.zcasher_name_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_name_map FOR ALL TO service_role USING (true);

ALTER TABLE public.zcasher_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_verifications FOR ALL TO service_role USING (true);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.verification_codes FOR ALL TO service_role USING (true);

ALTER TABLE public.verification_poll_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.verification_poll_requests FOR ALL TO service_role USING (true);
```

---

## Fix 4: Switch All Views to Security Invoker

```sql
ALTER VIEW public.staging_tx_with_profile SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_daily SET (security_invoker = on);
ALTER VIEW public.staging_tx_full SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_alltime SET (security_invoker = on);
ALTER VIEW public.staging_tx_with_zid SET (security_invoker = on);
ALTER VIEW public.staging_unified SET (security_invoker = on);
ALTER VIEW public.zcasher_enriched SET (security_invoker = on);
ALTER VIEW public.growth_over_time SET (security_invoker = on);
ALTER VIEW public.zcasher_searchable SET (security_invoker = on);
ALTER VIEW public.growth_over_time_monthly SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_weekly SET (security_invoker = on);
ALTER VIEW public.growth_over_time_daily SET (security_invoker = on);
ALTER VIEW public.public_profile SET (security_invoker = on);
ALTER VIEW public.zcasher_with_referral_rank SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_monthly SET (security_invoker = on);
```

---

## All Diagnostic Queries Used (in order)

### 1. Check which tables have RLS enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. Check all existing RLS policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Check view dependencies (which base tables each view reads from)
```sql
SELECT DISTINCT d.view_name, d.table_name AS depends_on
FROM information_schema.view_column_usage d
WHERE d.view_schema = 'public'
  AND d.table_schema = 'public'
ORDER BY d.view_name, d.table_name;
```

### 4. Check columns of tables used by views
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('zcasher_links', 'staging_transactions')
ORDER BY table_name, ordinal_position;
```

### 5. Verify security_invoker status on views
```sql
SELECT viewname,
  (reloptions IS NOT NULL AND 'security_invoker=on' = ANY(reloptions)) AS is_security_invoker
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname AND c.relnamespace = 'public'::regnamespace
WHERE v.schemaname = 'public'
  AND v.viewname IN ('referrer_ranked_alltime', 'referrer_ranked_weekly', 'growth_over_time_daily', 'referrer_ranked_monthly')
ORDER BY v.viewname;
```

### 6. Check view type (regular vs materialized) and reloptions
```sql
SELECT c.relname, c.relkind, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('referrer_ranked_alltime', 'referrer_ranked_weekly', 'growth_over_time_daily', 'referrer_ranked_monthly');
```

### 7. Get all function definitions (for search_path audit)
```sql
SELECT p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'confirm_otp_sql', 'confirm_otp_sql_v2', 'extract_label',
    'set_verif_expires_at', 'delete_old_zcashme_images',
    'update_zcasher_verification_summary', 'sync_legacy_verification_flags',
    'sync_referred_by_zcasher_id', 'trigger_set_timestamp'
  )
ORDER BY p.proname;
```

---

## All Fix Commands Applied (in order)

### Step 1: Drop duplicate indexes
```sql
DROP INDEX IF EXISTS public.zcasher_address_uidx;
DROP INDEX IF EXISTS public.zcasher_slug_idx;
```

### Step 2: zcasher_links — RLS + public SELECT + service_role ALL
```sql
ALTER TABLE public.zcasher_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.zcasher_links FOR SELECT USING (true);
CREATE POLICY "Allow service role full access" ON public.zcasher_links FOR ALL TO service_role USING (true);
```

### Step 3: staging_transactions — RLS + public SELECT + service_role ALL
```sql
ALTER TABLE public.staging_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.staging_transactions FOR SELECT USING (true);
CREATE POLICY "Allow service role full access" ON public.staging_transactions FOR ALL TO service_role USING (true);
```

### Step 4: bot_posted_tweets — RLS + service_role only
```sql
ALTER TABLE public.bot_posted_tweets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.bot_posted_tweets FOR ALL TO service_role USING (true);
```

### Step 5: refund_progress — RLS + service_role only
```sql
ALTER TABLE public.refund_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.refund_progress FOR ALL TO service_role USING (true);
```

### Step 6: zm_ns_staging — RLS + service_role only
```sql
ALTER TABLE public.zm_ns_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zm_ns_staging FOR ALL TO service_role USING (true);
```

### Step 7: zcasher_items — RLS + service_role only
```sql
ALTER TABLE public.zcasher_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_items FOR ALL TO service_role USING (true);
```

### Step 8: zcasher_map_data — RLS + service_role only
```sql
ALTER TABLE public.zcasher_map_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_map_data FOR ALL TO service_role USING (true);
```

### Step 9: transaction_ingest_log — RLS + service_role only
```sql
ALTER TABLE public.transaction_ingest_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.transaction_ingest_log FOR ALL TO service_role USING (true);
```

### Step 10: transactions — RLS + service_role only
```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.transactions FOR ALL TO service_role USING (true);
```

### Step 11: devtool_logs — RLS + service_role only
```sql
ALTER TABLE public.devtool_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.devtool_logs FOR ALL TO service_role USING (true);
```

### Step 12: pending_zcasher_edits — RLS + service_role only
```sql
ALTER TABLE public.pending_zcasher_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.pending_zcasher_edits FOR ALL TO service_role USING (true);
```

### Step 13: zcasher_name_map — RLS + service_role only
```sql
ALTER TABLE public.zcasher_name_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_name_map FOR ALL TO service_role USING (true);
```

### Step 14: zcasher_verifications — RLS + service_role only
```sql
ALTER TABLE public.zcasher_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.zcasher_verifications FOR ALL TO service_role USING (true);
```

### Step 15: verification_codes — RLS + service_role only (had exposed OTP column)
```sql
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.verification_codes FOR ALL TO service_role USING (true);
```

### Step 16: verification_poll_requests — RLS + service_role only
```sql
ALTER TABLE public.verification_poll_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON public.verification_poll_requests FOR ALL TO service_role USING (true);
```

### Steps 17-30: Switch views to security invoker (one at a time)
```sql
ALTER VIEW public.staging_tx_with_profile SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_daily SET (security_invoker = on);
ALTER VIEW public.staging_tx_full SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_alltime SET (security_invoker = on);
ALTER VIEW public.staging_tx_with_zid SET (security_invoker = on);
ALTER VIEW public.staging_unified SET (security_invoker = on);
ALTER VIEW public.zcasher_enriched SET (security_invoker = on);
ALTER VIEW public.growth_over_time SET (security_invoker = on);
ALTER VIEW public.zcasher_searchable SET (security_invoker = on);
ALTER VIEW public.growth_over_time_monthly SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_weekly SET (security_invoker = on);
ALTER VIEW public.growth_over_time_daily SET (security_invoker = on);
ALTER VIEW public.public_profile SET (security_invoker = on);
ALTER VIEW public.zcasher_with_referral_rank SET (security_invoker = on);
ALTER VIEW public.referrer_ranked_monthly SET (security_invoker = on);
```

**Note:** 4 views required re-running (referrer_ranked_alltime, referrer_ranked_weekly, growth_over_time_daily, referrer_ranked_monthly) — the first attempt silently failed. Verified fix with diagnostic query #6.

### Step 31: zcasher_links — public INSERT (needed for signup flow)
```sql
CREATE POLICY "Allow public insert" ON public.zcasher_links FOR INSERT WITH CHECK (true);
```
AddUserForm.jsx inserts links after creating a new profile. Without this, signup would silently fail to add links.

### Step 32: zcasher_links — public UPDATE (quick fix for verification flow)
```sql
CREATE POLICY "Allow public update" ON public.zcasher_links FOR UPDATE USING (true) WITH CHECK (true);
```
ProfileEditor.jsx updates `is_verified` after social proof callback. **This is a temporary quick fix** — anyone with the anon key can update any link. Should be replaced with a SECURITY DEFINER RPC function.

### Step 33: admin_refund_progress — service_role policy (table had RLS ON but zero policies)
```sql
CREATE POLICY "Allow service role full access" ON public.admin_refund_progress FOR ALL TO service_role USING (true);
```
This table had RLS enabled but no policies at all, making it completely inaccessible.

---

## Post-Fix Verification

### API smoke test (all returned HTTP 200 with anon key)
```bash
for view in zcasher_searchable growth_over_time growth_over_time_daily \
  growth_over_time_monthly referrer_ranked_alltime referrer_ranked_weekly \
  referrer_ranked_monthly referrer_ranked_daily staging_unified public_profile; do
  curl -s -o /dev/null -w "%{http_code}" \
    "https://fpwrazvgrmatlajjzdiq.supabase.co/rest/v1/$view?select=*&limit=1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
done
```

### Confirmed anon UPDATE is blocked without policy, allowed with policy
```bash
# Returns empty array (0 rows affected) when no UPDATE policy exists
curl -s "https://fpwrazvgrmatlajjzdiq.supabase.co/rest/v1/zcasher_links?id=eq.1&select=id,is_verified" \
  -X PATCH \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"is_verified": true}'
```

---

## Full Audit Diagnostic Query

Used to generate the complete table/column/RLS/policy overview:
```sql
-- (run in SQL Editor to get full audit of all tables, columns, RLS status, and policies)
-- This was the query that produced the comprehensive audit table
```

---

## Result

**Errors: 31 → 0**
**Warnings: 12 → 0**

### Note on 4 stubborn views

The following 4 views required a second run of `ALTER VIEW ... SET (security_invoker = on)` — the first attempt silently failed (reloptions remained null). Verified via:
```sql
SELECT c.relname, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('referrer_ranked_alltime', 'referrer_ranked_weekly', 'growth_over_time_daily', 'referrer_ranked_monthly');
```
After re-running, all 4 confirmed `["security_invoker=on"]`.

---

## Remaining Info-Level Items (not actionable as errors/warnings)

### Unindexed Foreign Keys
| table | foreign key |
|-------|------------|
| dev.zcasher_links | dev_zcasher_links_zcasher_id_fkey |
| public.transactions | transactions_zcasher_id_fkey |
| public.zcasher | zcasher_nearest_city_fk |
| public.zcasher_items | zcasher_items_zcasher_id_fkey |
| public.zcasher_links | zcasher_links_zcasher_id_fkey |
| public.zcasher_verifications | zcasher_verifications_link_id_fkey |

### No Primary Key
- `public.zm_ns_staging`
- `public.zcasher_name_map`
- `public.worldcities`
- `public.staging_transactions`

### Unused Indexes
- `dev.zcasher`: dev_zcasher_address_idx, dev_zcasher_claimed_idx, dev_zcasher_created_at_idx, dev_zcasher_created_desc_idx, dev_zcasher_refid_idx, dev_zcasher_verified_idx
- `public.auth_challenges`: idx_auth_challenges_user_id
- `public.verification_codes`: idx_verification_codes_zid
- `public.zcasher`: idx_zcasher_created_at, zcasher_address_idx
- `public.transaction_ingest_log`: transaction_ingest_log_txid_idx
- `public.verification_poll_requests`: verification_poll_requests_status_idx, verification_poll_requests_started_at_idx

### Auth/Config
- Auth DB connection strategy is absolute (10), not percentage-based

---

## Current RLS Policy Summary (post-fix)

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `zcasher` | public | public | — | — | Anyone can create profiles (pre-existing) |
| `zcasher_links` | public | public | **public** | — | **UPDATE is open — needs RPC migration** |
| `staging_transactions` | public | — | — | — | Read-only for views |
| `worldcities` | public | — | — | — | Read-only city search |
| `auth_challenges` | service_role | service_role | service_role | service_role | |
| `bot_posted_tweets` | service_role | service_role | service_role | service_role | |
| `devtool_logs` | service_role | service_role | service_role | service_role | |
| `pending_zcasher_edits` | service_role | service_role | service_role | service_role | |
| `refund_progress` | service_role | service_role | service_role | service_role | |
| `admin_refund_progress` | service_role | service_role | service_role | service_role | |
| `transactions` | service_role | service_role | service_role | service_role | |
| `transaction_ingest_log` | service_role | service_role | service_role | service_role | |
| `verification_codes` | service_role | service_role | service_role | service_role | Contains OTP data |
| `verification_poll_requests` | service_role | service_role | service_role | service_role | |
| `zcasher_items` | service_role | service_role | service_role | service_role | |
| `zcasher_map_data` | service_role | service_role | service_role | service_role | |
| `zcasher_name_map` | service_role | service_role | service_role | service_role | |
| `zcasher_verifications` | service_role | service_role | service_role | service_role | |
| `zm_ns_staging` | service_role | service_role | service_role | service_role | |

## Known Security Concerns

1. **`zcasher_links` has open public UPDATE** — anyone with the anon key can mark any link as `is_verified = true`. This should be moved to a `SECURITY DEFINER` RPC that validates the verification flow server-side.
2. **`zcasher` has open public INSERT** — anyone can create profiles. This was pre-existing behavior.
3. **Both frontend and server code use the anon key** — no service_role key is used in the codebase. Edge functions (if any) would need the service_role key to access locked-down tables.

## Post-Fix Checklist

- [x] Refresh Supabase Security Advisor — confirm 0 errors, 0 warnings
- [x] API smoke test: all 10 views return HTTP 200 with anon key
- [ ] Smoke test: frontend loads profiles (zcasher_searchable view)
- [ ] Smoke test: stats page loads growth charts (growth_over_time_* views)
- [ ] Smoke test: referral leaderboards load (referrer_ranked_* views)
- [ ] Smoke test: OTP verification still works (confirm_otp_sql RPC)
- [ ] Smoke test: admin refund page loads (staging_unified view)
- [ ] Smoke test: new user signup adds links (zcasher_links INSERT)
- [ ] **TODO: Move zcasher_links UPDATE to SECURITY DEFINER RPC**
