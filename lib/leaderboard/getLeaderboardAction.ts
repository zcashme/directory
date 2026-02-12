"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export type Period = "daily" | "weekly" | "monthly" | "alltime";

export interface LeaderboardEntry {
  rank: number;
  referrerId: number;
  referrerName: string;
  totalReferrals: number;
  verifiedReferrals: number;
  unverifiedReferrals: number;
  conversionRate: number;
}

export interface LeaderboardResponse {
  ok: boolean;
  data: LeaderboardEntry[];
  error?: string;
}

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

export async function getLeaderboardAction(
  period: Period = "alltime"
): Promise<LeaderboardResponse> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection error", data: [] };
    }

    // Fetch all users with their referrer info
    const { data: users, error } = await supabase
      .from("zcasher")
      .select("id, name, referred_by_zcasher_id, address_verified, created_at, last_verified_at")
      .not("referred_by_zcasher_id", "is", null);

    if (error) {
      return { ok: false, error: error.message, data: [] };
    }

    if (!users || users.length === 0) {
      return { ok: true, data: [] };
    }

    const periodStart = getPeriodFilter(period);

    // Group referrals by referrer
    const referrerStats = new Map<
      number,
      {
        name: string;
        total: number;
        verified: number;
        unverified: number;
      }
    >();

    // Get unique referrer IDs to fetch their names
    const referrerIds = [...new Set(users.map((u) => u.referred_by_zcasher_id).filter(Boolean))];

    // Fetch referrer names
    const { data: referrers } = await supabase
      .from("zcasher")
      .select("id, name")
      .in("id", referrerIds);

    const referrerNames = new Map<number, string>(
      (referrers || []).map((r) => [r.id, r.name || `User ${r.id}`])
    );

    // Process each referred user
    for (const user of users) {
      const referrerId = user.referred_by_zcasher_id;
      if (!referrerId || referrerId === user.id) continue; // Skip self-referrals

      // For period filtering, check when the user was created (referral happened)
      if (periodStart) {
        const createdAt = new Date(user.created_at);
        if (createdAt < periodStart) continue;
      }

      const current = referrerStats.get(referrerId) || {
        name: referrerNames.get(referrerId) || `User ${referrerId}`,
        total: 0,
        verified: 0,
        unverified: 0,
      };

      current.total++;
      if (user.address_verified) {
        current.verified++;
      } else {
        current.unverified++;
      }

      referrerStats.set(referrerId, current);
    }

    // Convert to array and sort by verified referrals (ranking metric)
    const entries: LeaderboardEntry[] = Array.from(referrerStats.entries())
      .map(([referrerId, stats]) => ({
        rank: 0,
        referrerId,
        referrerName: stats.name,
        totalReferrals: stats.total,
        verifiedReferrals: stats.verified,
        unverifiedReferrals: stats.unverified,
        conversionRate: stats.total > 0 ? (stats.verified / stats.total) * 100 : 0,
      }))
      .sort((a, b) => {
        // Primary: verified referrals (desc)
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

    return { ok: true, data: entries };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: [],
    };
  }
}
