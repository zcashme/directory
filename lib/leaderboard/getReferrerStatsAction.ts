"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";
import {
  ELIGIBILITY_WINDOW_WEEKS,
  REWARD_DURATION_MONTHS,
  addWeeks,
  addMonths,
  computeReferralStatus,
  type ReferralStatus,
} from "./rewardProgram";

export type StillActiveFlag = "YES" | "NO" | "N/A";

export interface ReferralRow {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  createdAt: string;
  firstVerifiedAt: string | null;
  status: ReferralStatus;
  eligibleUntil: string;
  eligibleFlag: boolean;
  rewardsActivated: boolean;
  totalLinksCount: number;
  verifiedLinksCount: number;
  countVerifs: number;
  activationExpiryDate: string | null;
  stillActive: StillActiveFlag;
  earnedZats: number;
}

export interface ReferrerProfile {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  rankAlltime: number | null;
  rankWeekly: number | null;
  rankMonthly: number | null;
}

export interface ReferrerStatsSummary {
  total: number;
  verified: number;
  eligible: number;
  active: number;
  totalEarnedZats: number;
}

export interface ReferrerStatsResponse {
  ok: boolean;
  error?: string;
  referrer: ReferrerProfile | null;
  referrals: ReferralRow[];
  summary: ReferrerStatsSummary;
}

function toZatsInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return 0;
}

function computeStillActive(
  createdAt: Date,
  firstVerifiedAt: Date | null,
  now: Date,
): StillActiveFlag {
  const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);

  if (now >= eligibilityDeadline && (!firstVerifiedAt || firstVerifiedAt > eligibilityDeadline)) {
    return "N/A";
  }

  if (!firstVerifiedAt) return "N/A";

  const expiryDate = addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS);
  return now < expiryDate ? "YES" : "NO";
}

export async function getReferrerStatsAction(
  username: string,
): Promise<ReferrerStatsResponse> {
  const empty: ReferrerStatsResponse = {
    ok: false,
    referrer: null,
    referrals: [],
    summary: { total: 0, verified: 0, eligible: 0, active: 0, totalEarnedZats: 0 },
  };

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ...empty, error: "Database connection error" };
    }

    const normalized = sanitizeUsernameInput(username);
    const { data: referrerRow, error: referrerError } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, address_verified")
      .or(`name.eq."${normalized}",name.eq."${normalized.replace(/_/g, " ")}"`)
      .limit(1)
      .single();

    if (referrerError || !referrerRow) {
      return { ...empty, error: "Referrer not found" };
    }

    const referrer: ReferrerProfile = {
      id: referrerRow.id,
      username: referrerRow.name ?? `user${referrerRow.id}`,
      displayName: referrerRow.display_name ?? referrerRow.name ?? `User ${referrerRow.id}`,
      profileImageUrl: referrerRow.profile_image_url ?? null,
      addressVerified: !!referrerRow.address_verified,
      rankAlltime: null,
      rankWeekly: null,
      rankMonthly: null,
    };

    const referredPromise = supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, address_verified, created_at, first_verified_at")
      .eq("referred_by_zcasher_id", referrer.id)
      .neq("id", referrer.id)
      .order("created_at", { ascending: false });

    const rankAlltimePromise = supabase
      .from("referrer_ranked_alltime")
      .select("rank_alltime")
      .eq("referred_by_zcasher_id", referrer.id)
      .limit(1)
      .maybeSingle();

    const rankWeeklyPromise = supabase
      .from("referrer_ranked_weekly")
      .select("rank_weekly")
      .eq("referred_by_zcasher_id", referrer.id)
      .limit(1)
      .maybeSingle();

    const rankMonthlyPromise = supabase
      .from("referrer_ranked_monthly")
      .select("rank_monthly")
      .eq("referred_by_zcasher_id", referrer.id)
      .limit(1)
      .maybeSingle();

    const [
      { data: referred, error: referredError },
      { data: rankAlltimeData },
      { data: rankWeeklyData },
      { data: rankMonthlyData },
    ] = await Promise.all([
      referredPromise,
      rankAlltimePromise,
      rankWeeklyPromise,
      rankMonthlyPromise,
    ]);

    const referrerWithRanks: ReferrerProfile = {
      ...referrer,
      rankAlltime: typeof rankAlltimeData?.rank_alltime === "number" ? rankAlltimeData.rank_alltime : null,
      rankWeekly: typeof rankWeeklyData?.rank_weekly === "number" ? rankWeeklyData.rank_weekly : null,
      rankMonthly: typeof rankMonthlyData?.rank_monthly === "number" ? rankMonthlyData.rank_monthly : null,
    };

    if (referredError) {
      return { ...empty, ok: false, referrer: referrerWithRanks, error: referredError.message };
    }

    const referredIds = (referred ?? []).map((u) => u.id);
    const referredLinksMap = new Map<number, { total: number; verified: number }>();
    const referredVerificationRowsMap = new Map<number, Array<{
      verifiedAtTs: number | null;
      countsForCommission: boolean;
      rewardZats: number;
    }>>();

    if (referredIds.length > 0) {
      const [{ data: referredLinks }, { data: verifications }] = await Promise.all([
        supabase
          .from("zcasher_links")
          .select("zcasher_id, is_verified")
          .in("zcasher_id", referredIds),
        supabase
          .from("zcasher_verifications")
          .select("zcasher_id, verified_at, counts_for_commission, reward_zats")
          .in("zcasher_id", referredIds)
          .eq("referred_by_zcasher_id", referrer.id),
      ]);

      for (const link of referredLinks ?? []) {
        const entry = referredLinksMap.get(link.zcasher_id) ?? { total: 0, verified: 0 };
        entry.total += 1;
        if (link.is_verified) entry.verified += 1;
        referredLinksMap.set(link.zcasher_id, entry);
      }

      for (const verification of verifications ?? []) {
        const entry = referredVerificationRowsMap.get(verification.zcasher_id) ?? [];
        const verifiedAtTs = verification.verified_at ? Date.parse(verification.verified_at) : Number.NaN;
        entry.push({
          verifiedAtTs: Number.isFinite(verifiedAtTs) ? verifiedAtTs : null,
          countsForCommission: !!verification.counts_for_commission,
          rewardZats: toZatsInteger(verification.reward_zats),
        });
        referredVerificationRowsMap.set(verification.zcasher_id, entry);
      }
    }

    const now = new Date();
    let verified = 0;
    let eligible = 0;
    let active = 0;
    let totalEarnedZats = 0;

    const referrals: ReferralRow[] = (referred ?? []).map((u) => {
      const createdAt = new Date(u.created_at);
      const firstVerifiedAt = u.first_verified_at ? new Date(u.first_verified_at) : null;
      const isVerified = !!u.address_verified;

      if (isVerified) verified += 1;

      const status = computeReferralStatus(isVerified, createdAt, firstVerifiedAt, now);
      if (status === "eligible") eligible += 1;
      if (status === "active") active += 1;

      const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);
      const rewardsActivated = !!(firstVerifiedAt && firstVerifiedAt <= eligibilityDeadline);
      const activationExpiryDate = rewardsActivated && firstVerifiedAt
        ? addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS).toISOString()
        : null;

      const userLinks = referredLinksMap.get(u.id) ?? { total: 0, verified: 0 };
      const verificationRows = referredVerificationRowsMap.get(u.id) ?? [];
      const earnedZats = verificationRows
        .filter((row) => row.countsForCommission)
        .reduce((sum, row) => sum + row.rewardZats, 0);

      let countVerifs = 0;
      if (firstVerifiedAt) {
        const windowStartTs = firstVerifiedAt.getTime();
        const windowEndTs = addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS).getTime();
        countVerifs = verificationRows.filter((row) => {
          return row.verifiedAtTs !== null && row.verifiedAtTs >= windowStartTs && row.verifiedAtTs <= windowEndTs;
        }).length;
        if (countVerifs === 0) {
          // Legacy safeguard: a first verification exists, so show at least one event.
          countVerifs = 1;
        }
      }

      totalEarnedZats += earnedZats;

      return {
        id: u.id,
        username: u.name ?? `user${u.id}`,
        displayName: u.display_name ?? u.name ?? `User ${u.id}`,
        profileImageUrl: u.profile_image_url ?? null,
        addressVerified: isVerified,
        createdAt: u.created_at,
        firstVerifiedAt: u.first_verified_at ?? null,
        status,
        eligibleUntil: eligibilityDeadline.toISOString(),
        eligibleFlag: status === "eligible",
        rewardsActivated,
        totalLinksCount: userLinks.total,
        verifiedLinksCount: userLinks.verified,
        countVerifs,
        activationExpiryDate,
        stillActive: computeStillActive(createdAt, firstVerifiedAt, now),
        earnedZats,
      };
    });

    return {
      ok: true,
      referrer: referrerWithRanks,
      referrals,
      summary: {
        total: referrals.length,
        verified,
        eligible,
        active,
        totalEarnedZats,
      },
    };
  } catch (err) {
    return { ...empty, error: String((err as Error)?.message || err) };
  }
}
