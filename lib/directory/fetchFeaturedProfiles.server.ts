import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enrichLink } from "@/lib/profile/profileLinks";
import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";

export async function fetchFeaturedProfilesServer(limit: number = 6): Promise<Profile[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

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
  const profileIds = profiles.map((p) => p.id).filter((id): id is number => id !== null);

  // Fetch all links for these profiles
  const linksByProfileId: Record<number, EnrichedProfileLink[]> = {};
  const styleByProfileId: Record<number, {
    is_maxi: Profile["is_maxi"];
    profile_card_theme: Profile["profile_card_theme"];
    profile_page_bkgd: Profile["profile_page_bkgd"];
    profile_card_border: Profile["profile_card_border"];
    profile_theme_package: Profile["profile_theme_package"];
  }> = {};
  if (profileIds.length > 0) {
    const { data: linksData } = await supabase
      .from("zcasher_links")
      .select("id,label,url,platform,is_verified,zcasher_id")
      .in("zcasher_id", profileIds)
      .order("id", { ascending: true });

    const { data: styleData } = await supabase
      .from("zcasher")
      .select("id,is_maxi,profile_card_theme,profile_page_bkgd,profile_card_border,profile_theme_package")
      .in("id", profileIds);

    // Group links by profile ID
    if (linksData) {
      linksData.forEach((link) => {
        if (!linksByProfileId[link.zcasher_id]) {
          linksByProfileId[link.zcasher_id] = [];
        }
        linksByProfileId[link.zcasher_id].push(enrichLink(link));
      });
    }

    if (styleData) {
      styleData.forEach((styleRow) => {
        styleByProfileId[styleRow.id] = {
          is_maxi: styleRow.is_maxi as Profile["is_maxi"],
          profile_card_theme: styleRow.profile_card_theme as Profile["profile_card_theme"],
          profile_page_bkgd: styleRow.profile_page_bkgd as Profile["profile_page_bkgd"],
          profile_card_border: styleRow.profile_card_border as Profile["profile_card_border"],
          profile_theme_package: styleRow.profile_theme_package as Profile["profile_theme_package"],
        };
      });
    }
  }

  const enriched = profiles.map((p): Profile => {
    const linkList = linksByProfileId[p.id] || [];
    const linkVerifiedCount =
      p.verified_links_count ?? linkList.filter((l) => l.is_verified).length;
    const styleOverride = styleByProfileId[p.id];

    return {
      ...p,
      ...(styleOverride || {}),
      links: linkList,
      verified_links_count: linkVerifiedCount,
    } as Profile;
  });

  return enriched.sort(() => Math.random() - 0.5).slice(0, limit);
}
