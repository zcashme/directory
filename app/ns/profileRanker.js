import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getLastVerifiedLabel } from "@/lib/profile/profileUtils";

export async function fetchProfilesWithRanks() {
  const supabase = createSupabaseServerClient();

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

    const rankAll = new Map(
      (lbAll || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_alltime])
    );
    const rankWeek = new Map(
      (lbWeek || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_weekly])
    );
    const rankMonth = new Map(
      (lbMonth || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_monthly])
    );

    const pageSize = 1000;
    let from = 0;
    let all = [];
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

      all = all.concat(data || []);
      total = count || total;

      if (!data?.length || all.length >= total) break;
      from += pageSize;
    }

    const enriched = all.map((p) => {
      const pid = String(p.id);
      const addressVerified = p.address_verified || p.verified || false;
      const linkList = p.links || p.zcasher_links || [];
      const linkVerifiedCount =
        p.verified_links_count ?? linkList.filter((l) => l.is_verified).length;

      return {
        ...p,
        rank_alltime: rankAll.get(pid) || 0,
        rank_weekly: rankWeek.get(pid) || 0,
        rank_monthly: rankMonth.get(pid) || 0,
        address_verified: addressVerified,
        links: linkList,
        verified_links_count: linkVerifiedCount,
        last_verified_label: getLastVerifiedLabel(p),
      };
    });

    return enriched;
  } catch (err) {
    return [];
  }
}
