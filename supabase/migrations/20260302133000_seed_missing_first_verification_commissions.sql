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
    u.referred_by_zcasher_id AS referrer_id
  FROM public.zcasher u
  LEFT JOIN first_verification fv
    ON fv.zcasher_id = u.id
),
verified_links AS (
  SELECT
    zl.zcasher_id,
    COUNT(*) FILTER (WHERE zl.is_verified = true)::integer AS verified_links_count
  FROM public.zcasher_links zl
  GROUP BY zl.zcasher_id
),
activated_referrals AS (
  SELECT
    us.zcasher_id,
    us.referrer_id,
    us.first_verified_effective AS first_verified_at,
    us.first_verified_effective + interval '12 months' AS active_until_at,
    COALESCE(vl.verified_links_count, 0) AS verified_links_count,
    LEAST(
      0.5::numeric,
      0.15::numeric
      + CASE WHEN ref.profile_image_url IS NOT NULL AND btrim(ref.profile_image_url) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN ref.bio IS NOT NULL AND btrim(ref.bio) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + CASE WHEN ref.nearest_city_name IS NOT NULL AND btrim(ref.nearest_city_name) <> '' THEN 0.05::numeric ELSE 0::numeric END
      + (COALESCE(vl.verified_links_count, 0)::numeric * 0.10::numeric)
    ) AS commission_rate,
    ROUND(
      0.001::numeric * LEAST(
        0.5::numeric,
        0.15::numeric
        + CASE WHEN ref.profile_image_url IS NOT NULL AND btrim(ref.profile_image_url) <> '' THEN 0.05::numeric ELSE 0::numeric END
        + CASE WHEN ref.bio IS NOT NULL AND btrim(ref.bio) <> '' THEN 0.05::numeric ELSE 0::numeric END
        + CASE WHEN ref.nearest_city_name IS NOT NULL AND btrim(ref.nearest_city_name) <> '' THEN 0.05::numeric ELSE 0::numeric END
        + (COALESCE(vl.verified_links_count, 0)::numeric * 0.10::numeric)
      ) * 100000000::numeric
    )::bigint AS reward_zats
  FROM user_state us
  LEFT JOIN verified_links vl
    ON vl.zcasher_id = us.zcasher_id
  LEFT JOIN public.zcasher ref
    ON ref.id = us.referrer_id
  WHERE
    us.referrer_id IS NOT NULL
    AND us.first_verified_effective IS NOT NULL
    AND us.created_at_effective IS NOT NULL
    AND us.first_verified_effective <= us.created_at_effective + interval '4 weeks'
),
missing_paid_pairs AS (
  SELECT ar.*
  FROM activated_referrals ar
  LEFT JOIN LATERAL (
    SELECT 1
    FROM public.zcasher_verifications v
    WHERE
      v.zcasher_id = ar.zcasher_id
      AND COALESCE(v.referred_by_zcasher_id, ar.referrer_id) = ar.referrer_id
      AND v.counts_for_commission = true
      AND v.verified_at >= ar.first_verified_at
      AND v.verified_at <= ar.active_until_at
    LIMIT 1
  ) paid ON true
  WHERE paid IS NULL
),
window_rows AS (
  SELECT
    v.id,
    mp.zcasher_id,
    mp.referrer_id,
    mp.verified_links_count,
    mp.commission_rate,
    mp.reward_zats,
    mp.active_until_at
  FROM missing_paid_pairs mp
  JOIN public.zcasher_verifications v
    ON v.zcasher_id = mp.zcasher_id
   AND COALESCE(v.referred_by_zcasher_id, mp.referrer_id) = mp.referrer_id
   AND v.verified_at >= mp.first_verified_at
   AND v.verified_at <= mp.active_until_at
),
updated AS (
  UPDATE public.zcasher_verifications v
  SET
    referred_by_zcasher_id = wr.referrer_id,
    counts_for_commission = true,
    commission_rate_at_verification = wr.commission_rate,
    reward_zats = wr.reward_zats,
    verified_links_count_at_verification = wr.verified_links_count,
    active_until_at_verification = wr.active_until_at
  FROM window_rows wr
  WHERE v.id = wr.id
  RETURNING v.id
),
insert_candidates AS (
  SELECT mp.*
  FROM missing_paid_pairs mp
  LEFT JOIN window_rows wr
    ON wr.zcasher_id = mp.zcasher_id
   AND wr.referrer_id = mp.referrer_id
  WHERE wr.id IS NULL
),
inserted AS (
  INSERT INTO public.zcasher_verifications (
    zcasher_id,
    address,
    name,
    display_name,
    bio,
    slug,
    nearest_city_name,
    category,
    referred_by_zcasher_id,
    iso2,
    country,
    verified_at,
    links,
    commission_rate_at_verification,
    reward_zats,
    counts_for_commission,
    verified_links_count_at_verification,
    active_until_at_verification
  )
  SELECT
    ic.zcasher_id,
    u.address,
    u.name,
    u.display_name,
    u.bio,
    u.slug,
    u.nearest_city_name,
    u.category,
    ic.referrer_id,
    u.iso2,
    u.country,
    ic.first_verified_at,
    COALESCE(link_snapshot.links, '[]'::jsonb),
    ic.commission_rate,
    ic.reward_zats,
    true,
    ic.verified_links_count,
    ic.active_until_at
  FROM insert_candidates ic
  JOIN public.zcasher u
    ON u.id = ic.zcasher_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'url', l.url,
        'label', l.label,
        'platform', l.platform
      )
    ) AS links
    FROM public.zcasher_links l
    WHERE l.zcasher_id = ic.zcasher_id
  ) link_snapshot ON true
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM updated) AS updated_rows,
  (SELECT COUNT(*) FROM inserted) AS inserted_rows;

COMMIT;
