import { createSupabaseServerClient } from "./supabase-server";
import { getMockProfilesWithLinks } from "./mock-data";

// Check if we're in local demo mode (no real Supabase credentials)
const isLocalDemo = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return !url || !key || url.includes("your-project") || key.includes("your-anon-key");
};

// Helper function to get last verified label
function getLastVerifiedLabel(profile, nowMs) {
  const ts = profile?.last_verified_at || profile?.last_verified;
  if (!ts) return "n/a";
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return "n/a";
  const weeks = (nowMs - ms) / (1000 * 60 * 60 * 24 * 7);
  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
}

export async function fetchProfilesWithRanks() {
  const nowMs = Date.now();

  // Use mock data for local demo
  if (isLocalDemo()) {
    console.log("Using mock data for local demo");
    const mockProfiles = getMockProfilesWithLinks();

    return mockProfiles.map((p) => ({
      ...p,
      last_verified_label: getLastVerifiedLabel(p, nowMs),
    }));
  }

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
        console.error("Error loading profiles:", error);
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
        last_verified_label: getLastVerifiedLabel(p, nowMs),
      };
    });

    return enriched;
  } catch (err) {
    console.error("Profiles fetch failed:", err);
    return [];
  }
}
