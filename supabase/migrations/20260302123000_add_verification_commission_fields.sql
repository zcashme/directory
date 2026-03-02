BEGIN;

ALTER TABLE public.zcasher_verifications
  ADD COLUMN IF NOT EXISTS commission_rate_at_verification numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_zats bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS counts_for_commission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_links_count_at_verification integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_until_at_verification timestamptz;

WITH referred_verified_links AS (
  SELECT
    zl.zcasher_id,
    COUNT(*) FILTER (WHERE zl.is_verified = true)::integer AS verified_links_count
  FROM public.zcasher_links zl
  GROUP BY zl.zcasher_id
),
calc AS (
  SELECT
    v.id,
    COALESCE(rvl.verified_links_count, 0) AS verified_links_count_at_verification,
    CASE
      WHEN u.first_verified_at IS NULL THEN NULL
      ELSE u.first_verified_at + interval '12 months'
    END AS active_until_at_verification,
    CASE
      WHEN
        v.referred_by_zcasher_id IS NOT NULL
        AND u.first_verified_at IS NOT NULL
        AND COALESCE(u.created_at, v.verified_at) IS NOT NULL
        AND u.first_verified_at <= COALESCE(u.created_at, v.verified_at) + interval '4 weeks'
        AND v.verified_at >= u.first_verified_at
        AND v.verified_at <= u.first_verified_at + interval '12 months'
      THEN true
      ELSE false
    END AS counts_for_commission,
    LEAST(
      0.5::numeric,
      0.15::numeric
      + CASE WHEN r.profile_image_url IS NOT NULL AND btrim(r.profile_image_url) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN r.bio IS NOT NULL AND btrim(r.bio) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN r.nearest_city_name IS NOT NULL AND btrim(r.nearest_city_name) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + (COALESCE(rvl.verified_links_count, 0)::numeric * 0.10::numeric)
    ) AS commission_rate_if_counted
  FROM public.zcasher_verifications v
  LEFT JOIN public.zcasher u
    ON u.id = v.zcasher_id
  LEFT JOIN public.zcasher r
    ON r.id = v.referred_by_zcasher_id
  LEFT JOIN referred_verified_links rvl
    ON rvl.zcasher_id = v.zcasher_id
),
applied AS (
  UPDATE public.zcasher_verifications v
  SET
    verified_links_count_at_verification = c.verified_links_count_at_verification,
    active_until_at_verification = c.active_until_at_verification,
    counts_for_commission = c.counts_for_commission,
    commission_rate_at_verification = CASE
      WHEN c.counts_for_commission THEN c.commission_rate_if_counted
      ELSE 0
    END,
    reward_zats = CASE
      WHEN c.counts_for_commission THEN ROUND(0.001::numeric * c.commission_rate_if_counted * 100000000::numeric)::bigint
      ELSE 0
    END
  FROM calc c
  WHERE v.id = c.id
  RETURNING v.id
)
SELECT COUNT(*) AS backfilled_rows
FROM applied;

CREATE INDEX IF NOT EXISTS idx_verifications_referrer_user_verified_at
  ON public.zcasher_verifications USING btree (referred_by_zcasher_id, zcasher_id, verified_at);

CREATE INDEX IF NOT EXISTS idx_verifications_counted_by_referrer_user
  ON public.zcasher_verifications USING btree (referred_by_zcasher_id, zcasher_id, verified_at)
  WHERE counts_for_commission = true;

COMMIT;
