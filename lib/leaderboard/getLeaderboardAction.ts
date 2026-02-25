"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import {
  ELIGIBILITY_WINDOW_WEEKS,
  REWARD_DURATION_MONTHS,
  BASE_COMMISSION_RATE,
  VERIFICATION_FEE_ZEC,
  COMMISSION_DELTA_PER_LINK,
  MAX_COMMISSION_RATE,
  addMonths,
  monthsBetween,
  calculateCommissionRate,
  getCommissionTier,
  computeReferralStatus,
  type CommissionTier,
} from "./rewardProgram";

// ============================================
// TYPES
// ============================================

export type Period = "daily" | "weekly" | "monthly" | "alltime";

export interface LeaderboardEntry {
  rank: number;
  referrerId: number;
  referrerUsername: string;
  referrerDisplayName: string;
  referrerName: string;
  referrerProfileImageUrl: string | null;
  // Referral Performance
  totalReferrals: number;
  verifiedReferrals: number;
  unverifiedReferrals: number;
  conversionRate: number;
  // Reward Eligibility
  eligibleCount: number;
  ineligibleCount: number;
  pendingOpportunities: number;
  expiredOpportunities: number;
  // Verified Links (NEW)
  verifiedLinksCount: number;
  pendingLinksCount: number;
  currentCommissionRate: number;
  commissionTier: CommissionTier;
  potentialCommissionRate: number; // If pending links verify
  // Active Earnings
  activeRewardsCount: number;
  currentMonthlyPayout: number;
  totalRecurringRevenue: number;
  // Lifetime Earnings
  totalEarnedToDate: number;
  totalRewardsRemaining: number;
}

export interface LeaderboardResponse {
  ok: boolean;
  data: LeaderboardEntry[];
  error?: string;
  constants: {
    eligibilityWindowWeeks: number;
    rewardDurationMonths: number;
    baseCommissionRate: number;
    commissionDeltaPerLink: number;
    maxCommissionRate: number;
    verificationFeeZec: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPeriodFilter(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "daily":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "weekly":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "alltime":
    default:
      return null;
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

interface ReferralStats {
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  total: number;
  verified: number;
  unverified: number;
  eligibleCount: number;
  ineligibleCount: number;
  pendingOpportunities: number;
  expiredOpportunities: number;
  activeRewardsCount: number;
  verifiedLinksCount: number;
  pendingLinksCount: number;
  // Track individual eligible referrals with their locked commission rates
  eligibleReferrals: Array<{
    lastVerifiedAt: Date;
    rewardEndDate: Date;
    isActive: boolean;
    lockedCommissionRate: number; // Rate at time of verification
  }>;
}

// ============================================
// MAIN ACTION
// ============================================

export async function getLeaderboardAction(
  period: Period = "alltime"
): Promise<LeaderboardResponse> {
  const constants = {
    eligibilityWindowWeeks: ELIGIBILITY_WINDOW_WEEKS,
    rewardDurationMonths: REWARD_DURATION_MONTHS,
    baseCommissionRate: BASE_COMMISSION_RATE,
    commissionDeltaPerLink: COMMISSION_DELTA_PER_LINK,
    maxCommissionRate: MAX_COMMISSION_RATE,
    verificationFeeZec: VERIFICATION_FEE_ZEC,
  };

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection error", data: [], constants };
    }

    // Fetch all users with their referrer info
    const { data: users, error } = await supabase
      .from("zcasher")
      .select("id, name, referred_by_zcasher_id, address_verified, created_at, last_verified_at")
      .not("referred_by_zcasher_id", "is", null);

    if (error) {
      return { ok: false, error: error.message, data: [], constants };
    }

    if (!users || users.length === 0) {
      return { ok: true, data: [], constants };
    }

    const now = new Date();
    const periodStart = getPeriodFilter(period);

    // Get unique referrer IDs
    const referrerIds = [...new Set(users.map((u) => u.referred_by_zcasher_id).filter(Boolean))];

    // Fetch referrer identities and links (display_name is optional with fallback)
    const linksPromise = supabase
      .from("zcasher_links")
      .select("zcasher_id, is_verified, pending_verif")
      .in("zcasher_id", referrerIds);

    const referrersWithDisplay = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url")
      .in("id", referrerIds);

    let referrers = referrersWithDisplay.data as
      | Array<{ id: number; name: string | null; display_name?: string | null; profile_image_url?: string | null }>
      | null;

    if (referrersWithDisplay.error) {
      const referrersFallback = await supabase
        .from("zcasher")
        .select("id, name, profile_image_url")
        .in("id", referrerIds);
      referrers = (referrersFallback.data as Array<{ id: number; name: string | null; profile_image_url?: string | null }> | null)
        ?.map((r) => ({ ...r, display_name: null })) ?? null;
    }

    const { data: allLinks } = await linksPromise;

    // Build referrer identity map
    const referrerIdentity = new Map<number, { username: string; displayName: string; profileImageUrl: string | null }>(
      (referrers || []).map((r) => [
        r.id,
        {
          username: r.name || `user${r.id}`,
          displayName: r.display_name || r.name || `User ${r.id}`,
          profileImageUrl: r.profile_image_url || null,
        },
      ])
    );

    // Build verified links count map
    const verifiedLinksMap = new Map<number, number>();
    const pendingLinksMap = new Map<number, number>();

    for (const link of allLinks ?? []) {
      const id = link.zcasher_id;
      if (link.is_verified) {
        verifiedLinksMap.set(id, (verifiedLinksMap.get(id) ?? 0) + 1);
      } else if (link.pending_verif) {
        pendingLinksMap.set(id, (pendingLinksMap.get(id) ?? 0) + 1);
      }
    }

    // Group referrals by referrer
    const referrerStats = new Map<number, ReferralStats>();

    // Process each referred user
    for (const user of users) {
      const referrerId = user.referred_by_zcasher_id;
      if (!referrerId || referrerId === user.id) continue; // Skip self-referrals

      const createdAt = new Date(user.created_at);
      const lastVerifiedAt = user.last_verified_at ? new Date(user.last_verified_at) : null;

      // For time-filtered periods, only count referrals within the period
      // Skip referrals that don't fall within the selected period
      if (periodStart) {
        const isVerifiedUser = user.address_verified && lastVerifiedAt;
        if (isVerifiedUser) {
          // For verified referrals, filter by verification date
          if (lastVerifiedAt < periodStart) {
            continue; // Skip - verified before the period started
          }
        } else {
          // For unverified referrals, filter by creation date
          if (createdAt < periodStart) {
            continue; // Skip - created before the period started
          }
        }
      }

      const referrerVerifiedLinks = verifiedLinksMap.get(referrerId) || 0;
      const referrerPendingLinks = pendingLinksMap.get(referrerId) || 0;
      const identity = referrerIdentity.get(referrerId);

      const current = referrerStats.get(referrerId) || {
        username: identity?.username || `user${referrerId}`,
        displayName: identity?.displayName || `User ${referrerId}`,
        profileImageUrl: identity?.profileImageUrl || null,
        total: 0,
        verified: 0,
        unverified: 0,
        eligibleCount: 0,
        ineligibleCount: 0,
        pendingOpportunities: 0,
        expiredOpportunities: 0,
        activeRewardsCount: 0,
        verifiedLinksCount: referrerVerifiedLinks,
        pendingLinksCount: referrerPendingLinks,
        eligibleReferrals: [],
      };

      current.total++;

      const isVerified = !!user.address_verified;
      if (isVerified) current.verified++;
      else current.unverified++;

      const status = computeReferralStatus(isVerified, createdAt, lastVerifiedAt, now);

      switch (status) {
        case "active":
        case "expired": {
          // Activated referrals (verified within eligibility window)
          current.eligibleCount++;
          const rewardEndDate = addMonths(lastVerifiedAt!, REWARD_DURATION_MONTHS);
          const isActive = status === "active";
          if (isActive) current.activeRewardsCount++;

          const lockedCommissionRate = calculateCommissionRate(referrerVerifiedLinks);
          current.eligibleReferrals.push({
            lastVerifiedAt: lastVerifiedAt!,
            rewardEndDate,
            isActive,
            lockedCommissionRate,
          });
          break;
        }
        case "eligible":
          current.pendingOpportunities++;
          break;
        case "ineligible":
          if (isVerified) current.ineligibleCount++;
          else current.expiredOpportunities++;
          break;
      }

      referrerStats.set(referrerId, current);
    }

    // Convert to array and calculate earnings
    const entries: LeaderboardEntry[] = Array.from(referrerStats.entries())
      .map(([referrerId, stats]) => {
        const currentCommissionRate = calculateCommissionRate(stats.verifiedLinksCount);
        const potentialCommissionRate = calculateCommissionRate(
          stats.verifiedLinksCount + stats.pendingLinksCount
        );

        // Calculate earnings using locked commission rates per referral
        let currentMonthlyPayout = 0;
        let totalRecurringRevenue = 0;
        let totalEarnedToDate = 0;
        let totalRewardsRemaining = 0;

        for (const referral of stats.eligibleReferrals) {
          const monthlyReward = VERIFICATION_FEE_ZEC * referral.lockedCommissionRate;

          if (referral.isActive) {
            currentMonthlyPayout += monthlyReward;
            totalRecurringRevenue += VERIFICATION_FEE_ZEC;
          }

          const monthsElapsed = Math.min(
            monthsBetween(referral.lastVerifiedAt, now),
            REWARD_DURATION_MONTHS
          );
          totalEarnedToDate += monthsElapsed * monthlyReward;

          if (referral.isActive) {
            const monthsRemaining = REWARD_DURATION_MONTHS - monthsElapsed;
            totalRewardsRemaining += monthsRemaining * monthlyReward;
          }
        }

        return {
          rank: 0,
          referrerId,
          referrerUsername: stats.username,
          referrerDisplayName: stats.displayName,
          referrerName: stats.username,
          referrerProfileImageUrl: stats.profileImageUrl,
          totalReferrals: stats.total,
          verifiedReferrals: stats.verified,
          unverifiedReferrals: stats.unverified,
          conversionRate: stats.total > 0 ? (stats.verified / stats.total) * 100 : 0,
          eligibleCount: stats.eligibleCount,
          ineligibleCount: stats.ineligibleCount,
          pendingOpportunities: stats.pendingOpportunities,
          expiredOpportunities: stats.expiredOpportunities,
          verifiedLinksCount: stats.verifiedLinksCount,
          pendingLinksCount: stats.pendingLinksCount,
          currentCommissionRate,
          commissionTier: getCommissionTier(stats.verifiedLinksCount),
          potentialCommissionRate,
          activeRewardsCount: stats.activeRewardsCount,
          currentMonthlyPayout,
          totalRecurringRevenue,
          totalEarnedToDate,
          totalRewardsRemaining,
        };
      })
      .sort((a, b) => {
        // Primary: verified referrals (desc) - ranking metric
        if (b.verifiedReferrals !== a.verifiedReferrals) {
          return b.verifiedReferrals - a.verifiedReferrals;
        }
        // Secondary: total referrals (desc)
        return b.totalReferrals - a.totalReferrals;
      });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return { ok: true, data: entries, constants };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: [],
      constants,
    };
  }
}
