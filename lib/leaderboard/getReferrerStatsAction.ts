"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";
import {
  ELIGIBILITY_WINDOW_WEEKS,
  REWARD_DURATION_MONTHS,
  VERIFICATION_FEE_ZEC,
  addWeeks,
  addMonths,
  monthsBetween,
  calculateCommissionRate,
  computeReferralStatus,
  type ReferralStatus,
} from "./rewardProgram";

// ── Still-Active flag values ────────────────────────────────
export type StillActiveFlag = "YES" | "NO" | "N/A";

export interface ReferralRow {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  createdAt: string;          // ISO string
  firstVerifiedAt: string | null;
  status: ReferralStatus;
  // New computed columns
  eligibleUntil: string;      // ISO string (createdAt + 4 weeks)
  eligibleFlag: boolean;      // within 4-week window right now
  rewardsActivated: boolean;  // verified within eligibility window
  totalLinksCount: number;
  verifiedLinksCount: number;
  activationExpiryDate: string | null; // firstVerifiedAt + 12 months (if activated)
  stillActive: StillActiveFlag;
  earnedZats: number;
}

export interface ReferrerProfile {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
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

// ── Helpers ──────────────────────────────────────────────────

function computeEarnedZats(
  status: ReferralStatus,
  firstVerifiedAt: Date,
  commissionOpts: {
    verifiedLinksCount: number;
    hasProfileImage: boolean;
    hasBio: boolean;
    hasLocation: boolean;
  },
  now: Date,
): number {
  if (status === "ineligible" || status === "eligible") return 0;

  const commissionRate = calculateCommissionRate(commissionOpts);
  const monthlyReward = VERIFICATION_FEE_ZEC * commissionRate;
  const monthsElapsed = Math.min(
    monthsBetween(firstVerifiedAt, now),
    REWARD_DURATION_MONTHS,
  );
  return Math.round(monthsElapsed * monthlyReward * 1e8);
}

function computeStillActive(
  createdAt: Date,
  firstVerifiedAt: Date | null,
  now: Date,
): StillActiveFlag {
  const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);

  // N/A: past eligibility window AND (never verified OR verified after window)
  if (now >= eligibilityDeadline && (!firstVerifiedAt || firstVerifiedAt > eligibilityDeadline)) {
    return "N/A";
  }

  // Not yet activated (still within window, hasn't verified yet)
  if (!firstVerifiedAt) return "N/A";

  // Activated — check if within 1-year reward window
  const expiryDate = addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS);
  return now < expiryDate ? "YES" : "NO";
}

// ── Main Action ──────────────────────────────────────────────

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

    // 1. Resolve referrer by username
    const normalized = sanitizeUsernameInput(username);
    const { data: referrerRow, error: referrerError } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, bio, nearest_city_name")
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
    };

    const profileFlags = {
      hasProfileImage: !!referrerRow.profile_image_url,
      hasBio: !!referrerRow.bio,
      hasLocation: !!referrerRow.nearest_city_name,
    };

    // 2. Fetch all users referred by this referrer
    const referredPromise = supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, address_verified, created_at, first_verified_at")
      .eq("referred_by_zcasher_id", referrer.id)
      .neq("id", referrer.id)
      .order("created_at", { ascending: false });

    // 3. Fetch referrer's links (all + verified)
    const linksPromise = supabase
      .from("zcasher_links")
      .select("zcasher_id, is_verified")
      .eq("zcasher_id", referrer.id);

    // 4. Fetch referred users' link counts
    const [{ data: referred, error: referredError }, { data: referrerLinks }] = await Promise.all([
      referredPromise,
      linksPromise,
    ]);

    if (referredError) {
      return { ...empty, ok: false, referrer, error: referredError.message };
    }

    const referredIds = (referred ?? []).map((u) => u.id);

    // Fetch all links for referred users to get total + verified counts per user
    let referredLinksMap = new Map<number, { total: number; verified: number }>();
    if (referredIds.length > 0) {
      const { data: referredLinks } = await supabase
        .from("zcasher_links")
        .select("zcasher_id, is_verified")
        .in("zcasher_id", referredIds);

      for (const link of referredLinks ?? []) {
        const entry = referredLinksMap.get(link.zcasher_id) ?? { total: 0, verified: 0 };
        entry.total++;
        if (link.is_verified) entry.verified++;
        referredLinksMap.set(link.zcasher_id, entry);
      }
    }

    const referrerVerifiedLinks = (referrerLinks ?? []).filter((l) => l.is_verified).length;
    const now = new Date();

    let verified = 0;
    let eligible = 0;
    let active = 0;
    let totalEarnedZats = 0;

    const referrals: ReferralRow[] = (referred ?? []).map((u) => {
      const createdAt = new Date(u.created_at);
      const firstVerifiedAt = u.first_verified_at ? new Date(u.first_verified_at) : null;
      const isVerified = !!u.address_verified;

      if (isVerified) verified++;

      const status = computeReferralStatus(isVerified, createdAt, firstVerifiedAt, now);

      if (status === "eligible") eligible++;
      if (status === "active" || status === "expired") {
        eligible++; // activated referrals were eligible
      }
      if (status === "active") active++;

      let earnedZats = 0;
      if (firstVerifiedAt && (status === "active" || status === "expired")) {
        earnedZats = computeEarnedZats(status, firstVerifiedAt, {
          verifiedLinksCount: referrerVerifiedLinks,
          ...profileFlags,
        }, now);
        totalEarnedZats += earnedZats;
      }

      // Computed columns
      const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);
      const rewardsActivated = !!(firstVerifiedAt && firstVerifiedAt <= eligibilityDeadline);
      const activationExpiryDate = rewardsActivated && firstVerifiedAt
        ? addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS).toISOString()
        : null;
      const userLinks = referredLinksMap.get(u.id) ?? { total: 0, verified: 0 };

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
        eligibleFlag: now < eligibilityDeadline,
        rewardsActivated,
        totalLinksCount: userLinks.total,
        verifiedLinksCount: userLinks.verified,
        activationExpiryDate,
        stillActive: computeStillActive(createdAt, firstVerifiedAt, now),
        earnedZats,
      };
    });

    const total = referrals.length;

    return {
      ok: true,
      referrer,
      referrals,
      summary: {
        total,
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
