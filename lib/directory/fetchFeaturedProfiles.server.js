import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enrichLink } from "@/lib/social/profileLinks";

export async function fetchFeaturedProfilesServer(limit = 6) {
  const supabase = createSupabaseServerClient();
  // First, get count of all featured profiles
  const { count } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true })
    .eq("featured", true);

  if (!count || count === 0) return [];

  // Fetch all featured profiles and randomly select
  const { data: profiles } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("featured", true);

  if (!profiles || profiles.length === 0) return [];

  // Get all profile IDs
  const profileIds = profiles.map((p) => p.id).filter((id) => id != null);

  // Fetch all links for these profiles
  let linksByProfileId = {};
  if (profileIds.length > 0) {
    const { data: linksData } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified,zcasher_id")
      .in("zcasher_id", profileIds)
      .order("id", { ascending: true });

    // Group links by profile ID
    if (linksData) {
      linksData.forEach((link) => {
        if (!linksByProfileId[link.zcasher_id]) {
          linksByProfileId[link.zcasher_id] = [];
        }
        linksByProfileId[link.zcasher_id].push(enrichLink(link));
      });
    }
  }

  // Enrich profiles with links
  const enriched = profiles.map((p) => {
    const linkList = linksByProfileId[p.id] || [];
    const linkVerifiedCount =
      p.verified_links_count ?? linkList.filter((l) => l.is_verified).length;

    return {
      ...p,
      links: linkList,
      verified_links_count: linkVerifiedCount,
    };
  });

  // Randomly shuffle and take the requested limit
  return enriched.sort(() => Math.random() - 0.5).slice(0, limit);
}
