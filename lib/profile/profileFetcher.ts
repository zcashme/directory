import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { Profile } from "@/types";

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
  rank_alltime: ranks.rank_alltime || 0,
  rank_weekly: ranks.rank_weekly || 0,
  rank_monthly: ranks.rank_monthly || 0,
});

export async function fetchProfileForSlug(rawSlug: string): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const slug = decodeURIComponent(rawSlug || "").trim().toLowerCase();
  if (!slug) return null;

  let profile: Profile | null = null;

  const dashMatch = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
  if (dashMatch?.groups?.id) {
    const id = parseInt(dashMatch.groups.id, 10);
    const { data } = await supabase
      .from("zcasher_searchable")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    profile = data || null;
  }

  if (!profile) {
    const { data } = await supabase
      .from("zcasher_searchable")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    profile = data || null;
  }

  if (!profile) {
    const slugAsName = slug.replace(/_/g, " ");
    const { data } = await supabase
      .from("zcasher_searchable")
      .select("*")
      .or(`name.ilike.${slugAsName},name.ilike.${slug}`)
      .limit(20);

    const candidates = data || [];
    const matching = candidates.filter(
      (p) => normalize(p.name || "") === normalize(slug)
    );

    if (matching.length) {
      const verified = matching.find(
        (p) => p.address_verified || (p.verified_links_count ?? 0) > 0 || p.links?.some((l: { is_verified: boolean }) => l.is_verified)
      );
      if (verified) profile = verified;
      else profile = matching.slice().sort((a, b) => a.id - b.id)[0];
    }
  }

  if (!profile) return null;

  const idKey = String(profile.id);

  type RankResult = { data: { rank_alltime?: number } | null; error: unknown };
  type WeeklyRankResult = { data: { rank_weekly?: number } | null; error: unknown };
  type MonthlyRankResult = { data: { rank_monthly?: number } | null; error: unknown };

  const [alltime, weekly, monthly]: [RankResult, WeeklyRankResult, MonthlyRankResult] = await Promise.all([
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
  ]);

  const ranks: RankData = {
    rank_alltime: alltime?.data?.rank_alltime || 0,
    rank_weekly: weekly?.data?.rank_weekly || 0,
    rank_monthly: monthly?.data?.rank_monthly || 0,
  };

  return mergeRanks(profile, ranks);
}
