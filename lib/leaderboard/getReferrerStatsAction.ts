"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

// Must stay in sync with getLeaderboardAction.ts
const ELIGIBILITY_WINDOW_WEEKS = 4;

// ── Types ────────────────────────────────────────────────────

export type ReferralStatus = "eligible" | "ineligible" | "pending" | "expired";

export interface ReferralRow {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  createdAt: string;          // ISO string
  lastVerifiedAt: string | null;
  status: ReferralStatus;
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
  unverified: number;
  conversionRate: number;     // 0–100
}

export interface ReferrerStatsResponse {
  ok: boolean;
  error?: string;
  referrer: ReferrerProfile | null;
  referrals: ReferralRow[];
  summary: ReferrerStatsSummary;
}

// ── Helpers ──────────────────────────────────────────────────

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function computeStatus(
  addressVerified: boolean,
  createdAt: Date,
  lastVerifiedAt: Date | null,
  now: Date,
): ReferralStatus {
  const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);

  if (addressVerified && lastVerifiedAt) {
    return lastVerifiedAt <= eligibilityDeadline ? "eligible" : "ineligible";
  }
  // Unverified
  return now <= eligibilityDeadline ? "pending" : "expired";
}

// ── Main Action ──────────────────────────────────────────────

export async function getReferrerStatsAction(
  username: string,
): Promise<ReferrerStatsResponse> {
  const empty: ReferrerStatsResponse = {
    ok: false,
    referrer: null,
    referrals: [],
    summary: { total: 0, verified: 0, unverified: 0, conversionRate: 0 },
  };

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ...empty, error: "Database connection error" };
    }

    // 1. Resolve referrer by username
    const { data: referrerRow, error: referrerError } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url")
      .eq("name", username)
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
    const { data: referred, error: referredError } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, address_verified, created_at, last_verified_at")
      .eq("referred_by_zcasher_id", referrer.id)
      .neq("id", referrer.id)           // exclude self-referral
      .order("created_at", { ascending: false });

    if (referredError) {
      return { ...empty, ok: false, referrer, error: referredError.message };
    }

    const now = new Date();
    let verified = 0;

    const referrals: ReferralRow[] = (referred ?? []).map((u) => {
      const createdAt = new Date(u.created_at);
      const lastVerifiedAt = u.last_verified_at ? new Date(u.last_verified_at) : null;
      const isVerified = !!u.address_verified;

      if (isVerified) verified++;

      return {
        id: u.id,
        username: u.name ?? `user${u.id}`,
        displayName: u.display_name ?? u.name ?? `User ${u.id}`,
        profileImageUrl: u.profile_image_url ?? null,
        addressVerified: isVerified,
        createdAt: u.created_at,
        lastVerifiedAt: u.last_verified_at ?? null,
        status: computeStatus(isVerified, createdAt, lastVerifiedAt, now),
      };
    });

    const total = referrals.length;
    const unverified = total - verified;

    return {
      ok: true,
      referrer,
      referrals,
      summary: {
        total,
        verified,
        unverified,
        conversionRate: total > 0 ? (verified / total) * 100 : 0,
      },
    };
  } catch (err) {
    return { ...empty, error: String((err as Error)?.message || err) };
  }
}
