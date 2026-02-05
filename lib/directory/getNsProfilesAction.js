"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * Server Action for fetching all NS profiles with rankings
 * Used by useNsProfiles hook for revalidation
 */
export async function getNsProfilesAction() {
  try {
    const supabase = createSupabaseServerClient();

    // Fetch rankings
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

    const toKey = (v) => String(v);

    const rankAll = new Map(
      (lbAll || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_alltime])
    );
    const rankWeek = new Map(
      (lbWeek || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_weekly])
    );
    const rankMonth = new Map(
      (lbMonth || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_monthly])
    );

    // Fetch all profiles with pagination
    const pageSize = 1000;
    let from = 0;
    let all = [];
    let total = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("zcasher_searchable")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching profiles:", error);
        break;
      }

      all = all.concat(data || []);
      total = count || total;

      if (!data?.length || all.length >= total) break;
      from += pageSize;
    }

    // Enrich profiles with rankings
    let enriched = all.map((p) => {
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
      };
    });

    // Development fallback
    if (process.env.NODE_ENV === "development" && enriched.length === 0) {
      enriched = [
        {
          id: 999001,
          name: "Local Test",
          slug: "local_test",
          address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
          address_verified: true,
          verified_links_count: 0,
          links: [],
          bio: "Offline demo profile for local development",
          featured: false,
          rank_alltime: 0,
          rank_weekly: 0,
          rank_monthly: 0,
        },
      ];
    }

    return {
      ok: true,
      data: enriched,
    };
  } catch (error) {
    console.error("Error fetching NS profiles:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      return {
        ok: true,
        data: [
          {
            id: 999001,
            name: "Local Test",
            slug: "local_test",
            address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
            address_verified: true,
            verified_links_count: 0,
            links: [],
            bio: "Offline demo profile for local development",
            featured: false,
            rank_alltime: 0,
            rank_weekly: 0,
            rank_monthly: 0,
          },
        ],
      };
    }

    return {
      ok: false,
      error: String(error?.message || error),
      data: [],
    };
  }
}
