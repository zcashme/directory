"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export interface PlatformStats {
  // Profile metrics
  totalProfiles: number;
  verifiedProfiles: number;
  unverifiedProfiles: number;
  verificationRate: number;

  // Growth (last 30 days)
  newProfilesLast30d: number;
  newVerifiedLast30d: number;

  // Referral program
  totalReferrers: number;
  totalReferred: number;
  referralVerificationRate: number;

  // Links
  totalLinks: number;
  verifiedLinks: number;
  linkVerificationRate: number;

  // Top platforms (links)
  topPlatforms: { platform: string; count: number }[];

  // Timestamps
  generatedAt: string;
}

export interface StatsResponse {
  ok: boolean;
  data: PlatformStats | null;
  error?: string;
}

export async function getStatsAction(): Promise<StatsResponse> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, data: null, error: "Database connection error" };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // Run all queries in parallel
    const [
      totalResult,
      verifiedResult,
      recentResult,
      recentVerifiedResult,
      referredResult,
      linksResult,
    ] = await Promise.all([
      // Total profiles
      supabase
        .from("zcasher")
        .select("*", { count: "exact", head: true }),

      // Verified profiles
      supabase
        .from("zcasher")
        .select("*", { count: "exact", head: true })
        .eq("address_verified", true),

      // New profiles last 30d
      supabase
        .from("zcasher")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgoISO),

      // New verified last 30d
      supabase
        .from("zcasher")
        .select("*", { count: "exact", head: true })
        .eq("address_verified", true)
        .gte("last_verified_at", thirtyDaysAgoISO),

      // Referred users (have a referrer)
      supabase
        .from("zcasher")
        .select("referred_by_zcasher_id, address_verified", { count: "exact" })
        .not("referred_by_zcasher_id", "is", null),

      // All links with platform info
      supabase
        .from("zcasher_links")
        .select("platform, is_verified"),
    ]);

    const totalProfiles = totalResult.count ?? 0;
    const verifiedProfiles = verifiedResult.count ?? 0;
    const unverifiedProfiles = totalProfiles - verifiedProfiles;
    const verificationRate =
      totalProfiles > 0 ? (verifiedProfiles / totalProfiles) * 100 : 0;

    const newProfilesLast30d = recentResult.count ?? 0;
    const newVerifiedLast30d = recentVerifiedResult.count ?? 0;

    // Referral stats
    const referredUsers = referredResult.data ?? [];
    const totalReferred = referredResult.count ?? referredUsers.length;
    const uniqueReferrers = new Set(
      referredUsers.map((u) => u.referred_by_zcasher_id).filter(Boolean)
    );
    const totalReferrers = uniqueReferrers.size;
    const referredVerified = referredUsers.filter(
      (u) => u.address_verified
    ).length;
    const referralVerificationRate =
      totalReferred > 0 ? (referredVerified / totalReferred) * 100 : 0;

    // Link stats
    const allLinks = linksResult.data ?? [];
    const totalLinks = allLinks.length;
    const verifiedLinks = allLinks.filter((l) => l.is_verified).length;
    const linkVerificationRate =
      totalLinks > 0 ? (verifiedLinks / totalLinks) * 100 : 0;

    // Top platforms
    const platformCounts = new Map<string, number>();
    for (const link of allLinks) {
      const p = link.platform || "other";
      platformCounts.set(p, (platformCounts.get(p) ?? 0) + 1);
    }
    const topPlatforms = Array.from(platformCounts.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      ok: true,
      data: {
        totalProfiles,
        verifiedProfiles,
        unverifiedProfiles,
        verificationRate,
        newProfilesLast30d,
        newVerifiedLast30d,
        totalReferrers,
        totalReferred,
        referralVerificationRate,
        totalLinks,
        verifiedLinks,
        linkVerificationRate,
        topPlatforms,
        generatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: String((error as Error)?.message || error),
    };
  }
}
