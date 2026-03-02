BEGIN;

WITH first_verification AS (
  SELECT
    v.zcasher_id,
    MIN(v.verified_at) AS first_verified_fallback
  FROM public.zcasher_verifications v
  GROUP BY v.zcasher_id
),
user_state AS (
  SELECT
    u.id AS zcasher_id,
    COALESCE(u.created_at, fv.first_verified_fallback) AS created_at_effective,
    COALESCE(u.first_verified_at, fv.first_verified_fallback) AS first_verified_effective,
    u.referred_by_zcasher_id AS current_referrer_id
  FROM public.zcasher u
  LEFT JOIN first_verification fv
    ON fv.zcasher_id = u.id
),
referred_verified_links AS (
  SELECT
    zl.zcasher_id,
    COUNT(*) FILTER (WHERE zl.is_verified = true)::integer AS verified_links_count
  FROM public.zcasher_links zl
  GROUP BY zl.zcasher_id
),
calc AS (
  SELECT
    v.id,
    COALESCE(v.referred_by_zcasher_id, us.current_referrer_id) AS effective_referrer_id,
    COALESCE(rvl.verified_links_count, 0) AS verified_links_count_at_verification,
    CASE
      WHEN us.first_verified_effective IS NULL THEN NULL
      ELSE us.first_verified_effective + interval '12 months'
    END AS active_until_at_verification,
    CASE
      WHEN
        COALESCE(v.referred_by_zcasher_id, us.current_referrer_id) IS NOT NULL
        AND us.first_verified_effective IS NOT NULL
        AND us.created_at_effective IS NOT NULL
        AND us.first_verified_effective <= us.created_at_effective + interval '4 weeks'
        AND v.verified_at >= us.first_verified_effective
        AND v.verified_at <= us.first_verified_effective + interval '12 months'
      THEN true
      ELSE false
    END AS counts_for_commission,
    LEAST(
      0.5::numeric,
      0.15::numeric
      + CASE WHEN ref.profile_image_url IS NOT NULL AND btrim(ref.profile_image_url) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN ref.bio IS NOT NULL AND btrim(ref.bio) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN ref.nearest_city_name IS NOT NULL AND btrim(ref.nearest_city_name) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + (COALESCE(rvl.verified_links_count, 0)::numeric * 0.10::numeric)
    ) AS commission_rate_if_counted
  FROM public.zcasher_verifications v
  LEFT JOIN user_state us
    ON us.zcasher_id = v.zcasher_id
  LEFT JOIN public.zcasher ref
    ON ref.id = COALESCE(v.referred_by_zcasher_id, us.current_referrer_id)
  LEFT JOIN referred_verified_links rvl
    ON rvl.zcasher_id = v.zcasher_id
),
patched AS (
  UPDATE public.zcasher_verifications v
  SET
    referred_by_zcasher_id = c.effective_referrer_id,
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
  RETURNING v.id, v.counts_for_commission, v.reward_zats
)
SELECT
  COUNT(*) AS updated_rows,
  COUNT(*) FILTER (WHERE counts_for_commission) AS counted_rows,
  COALESCE(SUM(reward_zats), 0) AS total_reward_zats
FROM patched;

COMMIT;
