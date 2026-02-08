import type { Profile } from "@/lib/profile/types";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getLastVerifiedLabel } from "@/lib/profile/profileUtils";

interface RankEntry {
  referred_by_zcasher_id: number;
  rank_alltime?: number;
  rank_weekly?: number;
  rank_monthly?: number;
}

export async function fetchProfilesWithRanks(): Promise<Profile[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    const [{ data: lbAll }, { data: lbWeek }, { data: lbMonth }] = await Promise.all([
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

    const rankAll = new Map<string, number>(
      (lbAll ?? []).map((r: RankEntry) => [String(r.referred_by_zcasher_id), r.rank_alltime ?? 0])
    );
    const rankWeek = new Map<string, number>(
      (lbWeek ?? []).map((r: RankEntry) => [String(r.referred_by_zcasher_id), r.rank_weekly ?? 0])
    );
    const rankMonth = new Map<string, number>(
      (lbMonth ?? []).map((r: RankEntry) => [String(r.referred_by_zcasher_id), r.rank_monthly ?? 0])
    );

    const pageSize = 1000;
    let from = 0;
    let all: Profile[] = [];
    let total = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("zcasher_searchable")
        .select("*", { count: "exact" })
        .eq("is_ns", true)
        .order("name", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        break;
      }

      all = all.concat(data ?? []);
      total = count ?? total;

      if (!data?.length || all.length >= total) break;
      from += pageSize;
    }

    const enriched: Profile[] = all.map((p): Profile => {
      const pid = String(p.id);
      const linkList = Array.isArray(p.links) ? p.links : [];
      const linkVerifiedCount = typeof p.verified_links_count === "number"
        ? p.verified_links_count
        : linkList.filter((l) => l.is_verified).length;

      return {
        ...p,
        rank_alltime: rankAll.get(pid) ?? 0,
        rank_weekly: rankWeek.get(pid) ?? 0,
        rank_monthly: rankMonth.get(pid) ?? 0,
        links: linkList,
        verified_links_count: linkVerifiedCount,
        last_verified_label: getLastVerifiedLabel(p),
      };
    });

    return enriched;
  } catch (_err) {
    return [];
  }
}
