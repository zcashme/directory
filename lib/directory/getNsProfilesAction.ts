"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { GetNsProfilesResponse } from "@/lib/api/types";
import type { Profile } from "@/lib/profile/types";

interface RankRow {
  referred_by_zcasher_id: number;
  rank_alltime?: number;
  rank_weekly?: number;
  rank_monthly?: number;
}

/**
 * Server Action for fetching all NS profiles with rankings
 * Used by useNsProfiles hook for revalidation
 */
export async function getNsProfilesAction(): Promise<GetNsProfilesResponse> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection error", data: [] };
    }

    // Fetch rankings - type the Promise.all results explicitly
    const [
      { data: lbAll },
      { data: lbWeek },
      { data: lbMonth }
    ] = await Promise.all([
      supabase
        .from("referrer_ranked_alltime")
        .select("referred_by_zcasher_id, rank_alltime")
        .order("rank_alltime", { ascending: true })
        .limit(10),
      supabase
        .from("referrer_ranked_weekly")
        .select("referred_by_zcasher_id, rank_weekly")
        .order("rank_weekly", { ascending: true })
        .limit(10),
      supabase
        .from("referrer_ranked_monthly")
        .select("referred_by_zcasher_id, rank_monthly")
        .order("rank_monthly", { ascending: true })
        .limit(10),
    ]);

    const toKey = (v: number | string): string => String(v);

    const rankAll = new Map<string, number>(
      (lbAll as RankRow[] || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_alltime || 0])
    );
    const rankWeek = new Map<string, number>(
      (lbWeek as RankRow[] || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_weekly || 0])
    );
    const rankMonth = new Map<string, number>(
      (lbMonth as RankRow[] || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_monthly || 0])
    );

    // Fetch all profiles with pagination
    const pageSize = 1000;
    let from = 0;
    let all: any[] = [];
    let total = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("zcasher_searchable")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        break;
      }

      all = all.concat(data || []);
      total = count || total;

      if (!data?.length || all.length >= total) break;
      from += pageSize;
    }

    // Enrich profiles with rankings
    const enriched = all.map((p): Profile => {
      const pid = String(p.id);
      const linkList = Array.isArray(p.links) ? p.links : [];
      const linkVerifiedCount = typeof p.verified_links_count === "number"
        ? p.verified_links_count
        : linkList.filter((l: any) => l.is_verified).length;

      return {
        ...p,
        rank_alltime: rankAll.get(pid) || 0,
        rank_weekly: rankWeek.get(pid) || 0,
        rank_monthly: rankMonth.get(pid) || 0,
        links: linkList,
        verified_links_count: linkVerifiedCount,
      };
    });

    return {
      ok: true,
      data: enriched,
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: [],
    };
  }
}
