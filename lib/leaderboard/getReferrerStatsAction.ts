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
} from "./rewardProgram";

// ── Types ────────────────────────────────────────────────────

export type ReferralStatus = "eligible" | "active" | "expired" | "ineligible";

export interface ReferralRow {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  createdAt: string;          // ISO string
  lastVerifiedAt: string | null;
  status: ReferralStatus;
  verifiedLinksCount: number;
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

function computeStatus(
  addressVerified: boolean,
  createdAt: Date,
  lastVerifiedAt: Date | null,
  now: Date,
): ReferralStatus {
  const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);

  // Verified AND verified within the 4-week window → activated
  if (addressVerified && lastVerifiedAt && lastVerifiedAt <= eligibilityDeadline) {
    const rewardEnd = addMonths(lastVerifiedAt, REWARD_DURATION_MONTHS);
    return now < rewardEnd ? "active" : "expired";
  }

  // Still within the 4-week window → eligible (can still activate)
  if (now < eligibilityDeadline) return "eligible";

  // 4-week window passed without valid verification
  return "ineligible";
}

function computeEarnedZats(
  status: ReferralStatus,
  lastVerifiedAt: Date,
  referrerVerifiedLinks: number,
  now: Date,
): number {
  if (status === "ineligible" || status === "eligible") return 0;

  const commissionRate = calculateCommissionRate(referrerVerifiedLinks);
  const monthlyReward = VERIFICATION_FEE_ZEC * commissionRate;
  const monthsElapsed = Math.min(
    monthsBetween(lastVerifiedAt, now),
    REWARD_DURATION_MONTHS,
  );
  // Convert ZEC to zats (1 ZEC = 1e8 zats)
  return Math.round(monthsElapsed * monthlyReward * 1e8);
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

    // 1. Resolve referrer by username (normalize to handle legacy spaces)
    const normalized = sanitizeUsernameInput(username);
    const { data: referrerRow, error: referrerError } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url")
      .or(`name.eq.${normalized},name.eq.${normalized.replace(/_/g, " ")}`)
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

    // 2. Fetch all users referred by this referrer
    const referredPromise = supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, address_verified, created_at, last_verified_at")
      .eq("referred_by_zcasher_id", referrer.id)
      .neq("id", referrer.id)
      .order("created_at", { ascending: false });

    // 3. Fetch referrer's verified links count
    const linksPromise = supabase
      .from("zcasher_links")
      .select("is_verified")
      .eq("zcasher_id", referrer.id)
      .eq("is_verified", true);

    const [{ data: referred, error: referredError }, { data: links }] = await Promise.all([
      referredPromise,
      linksPromise,
    ]);

    if (referredError) {
      return { ...empty, ok: false, referrer, error: referredError.message };
    }

    const referrerVerifiedLinks = links?.length ?? 0;
    const now = new Date();

    let verified = 0;
    let eligible = 0;
    let active = 0;
    let totalEarnedZats = 0;

    const referrals: ReferralRow[] = (referred ?? []).map((u) => {
      const createdAt = new Date(u.created_at);
      const lastVerifiedAt = u.last_verified_at ? new Date(u.last_verified_at) : null;
      const isVerified = !!u.address_verified;

      if (isVerified) verified++;

      const status = computeStatus(isVerified, createdAt, lastVerifiedAt, now);

      if (status === "eligible") eligible++;
      if (status === "active" || status === "expired") {
        eligible++; // activated referrals were eligible
      }
      if (status === "active") active++;

      let earnedZats = 0;
      if (lastVerifiedAt && (status === "active" || status === "expired")) {
        earnedZats = computeEarnedZats(status, lastVerifiedAt, referrerVerifiedLinks, now);
        totalEarnedZats += earnedZats;
      }

      return {
        id: u.id,
        username: u.name ?? `user${u.id}`,
        displayName: u.display_name ?? u.name ?? `User ${u.id}`,
        profileImageUrl: u.profile_image_url ?? null,
        addressVerified: isVerified,
        createdAt: u.created_at,
        lastVerifiedAt: u.last_verified_at ?? null,
        status,
        verifiedLinksCount: referrerVerifiedLinks,
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
