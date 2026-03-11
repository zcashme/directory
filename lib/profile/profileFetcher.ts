import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { Profile } from "@/lib/profile/types";

const normalize = (value: string = ""): string =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

interface RankData {
  rank_alltime: number;
  rank_weekly: number;
  rank_monthly: number;
}

const mergeRanks = (profile: Profile, ranks: RankData): Profile => ({
  ...profile,
  rank_alltime: ranks.rank_alltime ?? 0,
  rank_weekly: ranks.rank_weekly ?? 0,
  rank_monthly: ranks.rank_monthly ?? 0,
});

async function findProfileByName(supabase: any, name: string): Promise<Profile | null> {
  const nameAsSpace = name.replace(/_/g, " ");
  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .or(`name.ilike.${nameAsSpace},name.ilike.${name}`)
    .limit(20);

  const candidates = data ?? [];
  const matching = candidates.filter(
    (p: Profile) => normalize(p.name ?? "") === normalize(name)
  );

  if (!matching.length) return null;

  const verified = matching.find(
    (p: Profile) => p.address_verified || (p.verified_links_count ?? 0) > 0 || p.links?.some((l: { is_verified: boolean }) => l.is_verified)
  );
  return verified || matching.slice().sort((a: Profile, b: Profile) => (a.id ?? 0) - (b.id ?? 0))[0];
}

export const fetchProfileForSlug = cache(async function fetchProfileForSlug(rawSlug: string): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug) return null;

  let profile: Profile | null = null;

  // Try exact slug match first
  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  profile = data || null;

  // Try username-discriminator pattern (e.g., zooko-132)
  // Only for single-dash patterns (exclude multi-dash like "my-profile-name-123")
  if (!profile) {
    const dashMatch = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
    if (dashMatch?.groups?.id && dashMatch.groups.base) {
      const id = parseInt(dashMatch.groups.id, 10);
      const username = dashMatch.groups.base;

      const { data } = await supabase
        .from("zcasher_searchable")
        .select("*")
        .eq("id", id)
        .limit(1)
        .maybeSingle();

      // Validate that the username matches the discriminator
      if (data && normalize(data.name ?? "") === normalize(username)) {
        profile = data;
      } else {
        // If discriminator doesn't exist or username doesn't match, fall back to username search
        profile = await findProfileByName(supabase, username);
      }
    }
  }

  // Try name-based search
  if (!profile) {
    profile = await findProfileByName(supabase, slug);
  }

  if (!profile) return null;

  const idKey = String(profile.id);

  type RankResult = { data: { rank_alltime?: number } | null; error: unknown };
  type WeeklyRankResult = { data: { rank_weekly?: number } | null; error: unknown };
  type MonthlyRankResult = { data: { rank_monthly?: number } | null; error: unknown };
  type LinksResult = { data: Array<{ id: number; label?: string; url: string; platform?: string; is_verified: boolean; zcasher_id: number }> | null; error: unknown };

  const [alltime, weekly, monthly, links]: [RankResult, WeeklyRankResult, MonthlyRankResult, LinksResult] = await Promise.all([
    supabase
      .from("referrer_ranked_alltime")
      .select("rank_alltime")
      .eq("referred_by_zcasher_id", idKey)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("referrer_ranked_weekly")
      .select("rank_weekly")
      .eq("referred_by_zcasher_id", idKey)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("referrer_ranked_monthly")
      .select("rank_monthly")
      .eq("referred_by_zcasher_id", idKey)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("zcasher_links")
      .select("id,label,url,platform,is_verified,zcasher_id")
      .eq("zcasher_id", profile.id)
      .order("id", { ascending: true }),
  ]);

  const ranks: RankData = {
    rank_alltime: alltime?.data?.rank_alltime ?? 0,
    rank_weekly: weekly?.data?.rank_weekly ?? 0,
    rank_monthly: monthly?.data?.rank_monthly ?? 0,
  };

  // Attach links to profile
  profile.links = links?.data ?? [];

  // Pull design/entitlement flags directly from base table so feature
  // works even if zcasher_searchable view has not been updated yet.
  const { data: profileMaxiData } = await supabase
    .from("zcasher")
    .select("is_maxi")
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (profileMaxiData) {
    profile.is_maxi = profileMaxiData.is_maxi as Profile["is_maxi"];
  }

  const { data: profileThemeData } = await supabase
    .from("zcasher")
    .select("profile_card_theme")
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (profileThemeData) {
    profile.profile_card_theme = profileThemeData.profile_card_theme as Profile["profile_card_theme"];
  }

  const { data: profilePageBackgroundData } = await supabase
    .from("zcasher")
    .select("profile_page_bkgd")
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (profilePageBackgroundData) {
    profile.profile_page_bkgd = profilePageBackgroundData.profile_page_bkgd as Profile["profile_page_bkgd"];
  }

  const { data: profileCardBorderData } = await supabase
    .from("zcasher")
    .select("profile_card_border")
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (profileCardBorderData) {
    profile.profile_card_border = profileCardBorderData.profile_card_border as Profile["profile_card_border"];
  }

  const { data: profileThemePackageData } = await supabase
    .from("zcasher")
    .select("profile_theme_package")
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (profileThemePackageData) {
    profile.profile_theme_package = profileThemePackageData.profile_theme_package as Profile["profile_theme_package"];
  }

  return mergeRanks(profile, ranks);
});
