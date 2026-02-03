# Supabase Security Audit — zcash.me

**Date:** 2026-02-02
**Tester:** Automated (Claude Code, from zcash.me public frontend)
**Severity:** CRITICAL

---

## Executive Summary

All 15 public tables in the `public` schema are accessible with **full read/write/delete** permissions to **any unauthenticated visitor** of zcash.me. The publishable API key is embedded in a client-side JS bundle and trivially extractable. No Row-Level Security (RLS) is enabled on any of these tables.

The most critical finding is that **plaintext OTP codes** are readable from `verification_codes`, enabling verification hijacking.

---

## Attack Vector

### Step 1 — Extract the API key (30 seconds)

The Supabase publishable key is embedded in a Next.js chunk (`824-*.js`) and visible to anyone:

```
URL:  https://fpwrazvgrmatlajjzdiq.supabase.co
Key:  sb_publishable_IzToZbZsOrwTIhmMOhWoiQ__AJp--Kr
```

Found by searching JS bundles loaded by zcash.me for the string `fpwrazvgrmatlajjzdiq`.

### Step 2 — Query any table (immediate)

```js
fetch('https://fpwrazvgrmatlajjzdiq.supabase.co/rest/v1/verification_codes?select=*', {
  headers: {
    'apikey': 'sb_publishable_IzToZbZsOrwTIhmMOhWoiQ__AJp--Kr',
    'Authorization': 'Bearer sb_publishable_IzToZbZsOrwTIhmMOhWoiQ__AJp--Kr'
  }
})
```

This was executed **from the zcash.me browser tab** — no tools, no special access.

---

## Findings

### CRITICAL — Plaintext OTP exposure (`verification_codes`)

**71 rows** readable. Each row contains the raw `otp` field alongside `zcasher_id` and `expires_at`.

Sample data returned:

| zcasher_id | otp    | expires_at                  | is_verified |
|------------|--------|-----------------------------|-------------|
| 1784       | 113714 | 2025-12-11T04:31:44+00:00   | false       |
| 207        | 862053 | 2025-11-29T02:25:19+00:00   | true        |
| 1531       | 663618 | 2025-11-29T03:42:07+00:00   | true        |
| 9          | 796129 | 2025-11-29T01:07:15+00:00   | true        |

The `transactions` table also contains OTPs in memo fields (e.g. `"OTP:638275"`).

**Impact:** An attacker can poll this table, intercept OTPs in real-time, and complete verifications on behalf of any user.

---

### CRITICAL — Full write access on all tables

Confirmed via live test:

| Operation | Table                 | HTTP Status | Result           |
|-----------|-----------------------|-------------|------------------|
| INSERT    | `devtool_logs`        | 201         | Row created      |
| DELETE    | `devtool_logs`        | 200         | Row deleted      |
| DELETE    | `verification_codes`  | 200         | Accepted (no-op filter) |
| PATCH     | `verification_codes`  | 200         | Accepted (no-op filter) |
| INSERT    | `zcasher`             | 201         | Row created      |
| DELETE    | `zcasher`             | 204         | Row deleted      |

**Impact:** An attacker can:
- **Delete all verification codes** to block legitimate verifications
- **Modify OTPs** to ones they control
- **Insert fake zcasher profiles** into the directory
- **Delete or modify transactions**
- **Wipe staging data**

---

### HIGH — User PII exposure (`zcasher_map_data`, `zm_ns_staging`)

**`zcasher_map_data`** — 999 rows of user geolocation:

| zcasher_id | city                    | country       | lat      | lon       |
|------------|-------------------------|---------------|----------|-----------|
| 653        | Pindra                  | India         | 24.9595  | 80.7879   |
| 654        | Two Rivers              | United States | 44.1565  | -87.5824  |
| 656        | São João da Ocalina     | Brazil        | -23.98   | -51.8178  |

**`zm_ns_staging`** — 25 rows of Discord usernames, bios, LinkedIn, and Twitter handles:

| zcash.me name | discord_name          | twitter                    |
|---------------|-----------------------|----------------------------|
| Badshah       | chandrapal.badshah    | —                          |
| Jim Y         | jim_1618              | https://x.com/jim_1618     |

---

### HIGH — Zcash addresses exposed (`zcasher`)

The `zcasher` table is readable and contains **full shielded Zcash addresses** for all users, linked to their profile names.

---

### HIGH — SECURITY DEFINER views bypass RLS

15 views are defined with `SECURITY DEFINER`, meaning they execute with owner (`postgres`) privileges and bypass any RLS on underlying tables. The `zcasher_searchable` view alone exposes 42 columns including `claim_code`, `signin_challenge_code`, `signin_challenge_txid`, and `ephemeral_expires_at`.

Affected views:
- `public_profile`, `zcasher_enriched`, `zcasher_searchable`
- `staging_unified`, `staging_tx_full`, `staging_tx_with_zid`, `staging_tx_with_profile`
- `referrer_ranked_daily`, `referrer_ranked_weekly`, `referrer_ranked_monthly`, `referrer_ranked_alltime`
- `growth_over_time`, `growth_over_time_daily`, `growth_over_time_monthly`
- `zcasher_with_referral_rank`

---

### MEDIUM — Mutable `search_path` on 9 functions

These functions are vulnerable to search-path hijacking:

- `confirm_otp_sql`, `confirm_otp_sql_v2`
- `update_zcasher_verification_summary`
- `extract_label`, `set_verif_expires_at`
- `delete_old_zcashme_images`
- `sync_legacy_verification_flags`, `sync_referred_by_zcasher_id`
- `trigger_set_timestamp`

---

### LOW — Open INSERT policy on `zcasher`

The RLS policy `create zcasher` for INSERT has `WITH CHECK (true)`, allowing anyone to insert arbitrary rows. Confirmed: a test row was inserted (201) and cleaned up (204).

---

## Exposed Table Inventory

| Table                       | Rows  | Sensitive Columns                                      |
|-----------------------------|-------|--------------------------------------------------------|
| `verification_codes`        | 71    | `otp`, `code_hash`, `zcasher_id`, `attempts_left`     |
| `verification_poll_requests`| 87    | `matched_txid`, `matched_memo`, `otp_status`           |
| `zcasher_verifications`     | 250   | `zcasher_id`, `method`, `verified_at`                  |
| `zcasher_name_map`          | 970   | `name` → `canonical_id` mapping                        |
| `zcasher_links`             | 1,169 | `url`, `zcasher_id`, `is_verified`                     |
| `pending_zcasher_edits`     | 5,931 | `raw_memo` (contains profile update payloads)          |
| `devtool_logs`              | 2,813 | `action`, `meta` (debug data)                          |
| `transactions`              | 307   | `txid`, `memo` (contains OTPs), `raw`                  |
| `transaction_ingest_log`    | 5,524 | `memo_raw`, `raw_payload`                              |
| `zcasher_map_data`          | 999   | `city`, `country`, `lat`, `lon`                        |
| `zcasher_items`             | 1,283 | `kind`, `value`, `is_verified`                         |
| `zm_ns_staging`             | 25    | `discord name`, `discord bio`, `linkedin`, `twitter`   |
| `staging_transactions`      | 455   | `amount`, `outgoing_message`, `zcasher_address`        |
| `refund_progress`           | 0     | —                                                      |
| `bot_posted_tweets`         | 0     | —                                                      |

**Total exposed rows: ~19,880**

---

## Recommended Remediation

### Immediate (do now)

1. **Enable RLS on all 15 tables:**

```sql
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_poll_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcasher_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcasher_name_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcasher_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_zcasher_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE devtool_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_ingest_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcasher_map_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE zcasher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zm_ns_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_posted_tweets ENABLE ROW LEVEL SECURITY;
```

With no policies, this blocks **all** anon API access. Add policies only for what the frontend actually needs.

2. **Drop the `otp` column** from `verification_codes` — only `code_hash` should be stored. OTPs should never be persisted in plaintext.

3. **Invalidate all existing OTPs** — assume they are compromised.

### Short-term

4. Fix the `zcasher` INSERT policy — replace `WITH CHECK (true)` with actual validation.
5. Convert SECURITY DEFINER views to `SECURITY INVOKER` (Postgres 15+).
6. Set `search_path` on all 9 functions: `ALTER FUNCTION fn_name SET search_path = '';`
7. Remove `claim_code`, `signin_challenge_code` from `zcasher_searchable` view or restrict access.

### Medium-term

8. Enable HaveIBeenPwned password checking in Supabase Auth settings.
9. Upgrade Postgres to receive outstanding security patches.
10. Audit which tables the frontend actually needs read access to and create minimal SELECT-only policies for `anon` role.
