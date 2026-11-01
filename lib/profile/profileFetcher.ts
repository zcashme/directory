import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { Profile } from "@/lib/profile/types";
import { fetchLinksForProfileId } from "@/lib/profile/linksRepository";
import { PROFILE_SUFFIX_RE } from "@/lib/zns/slugs";

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

function pickNameMatch(candidates: Profile[], name: string): Profile | null {
  const matching = candidates.filter(
    (p) => normalize(p.name ?? "") === normalize(name) || normalize(p.slug ?? "") === normalize(name)
  );
  if (!matching.length) return null;
  const verified = matching.find(
    (p) => p.address_verified || (p.verified_links_count ?? 0) > 0 || p.links?.some((l: { is_verified: boolean }) => l.is_verified)
  );
  return verified || matching.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))[0];
}

async function findProfileByName(supabase: any, name: string): Promise<Profile | null> {
  const nameAsSpace = name.replace(/_/g, " ");
  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .or(`name.ilike.${nameAsSpace},name.ilike.${name}`)
    .limit(20);

  const fromSearchable = pickNameMatch((data ?? []) as Profile[], name);
  if (fromSearchable) return fromSearchable;

  const { data: rows } = await supabase
    .from("zcasher")
    .select("*")
    .or(`name.ilike.${nameAsSpace},name.ilike.${name},slug.eq.${name}`)
    .limit(20);
  return pickNameMatch((rows ?? []) as Profile[], name);
}

async function fetchRowById(supabase: any, id: number): Promise<Profile | null> {
  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (data) return data as Profile;

  const { data: row } = await supabase
    .from("zcasher")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  return (row as Profile) ?? null;
}

async function hydrateProfile(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profile: Profile
): Promise<Profile> {
  const idKey = String(profile.id);

  const [alltime, weekly, monthly, { data: profileLinks }] = await Promise.all([
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
    fetchLinksForProfileId(supabase, profile.id),
  ]);

  const ranks: RankData = {
    rank_alltime: alltime?.data?.rank_alltime ?? 0,
    rank_weekly: weekly?.data?.rank_weekly ?? 0,
    rank_monthly: monthly?.data?.rank_monthly ?? 0,
  };

  profile.links = profileLinks;

  const extraSelect = [
    "is_maxi",
    "profile_card_theme",
    "profile_page_bkgd",
    "profile_card_border",
    "profile_theme_package",
    "slug",
    "zns_name",
    "zns_active",
    "zns_claim_txid",
    "zns_bound_height",
    "zns_last_action",
    "zns_expires_at",
    "zns_address_height",
    "maxi_source",
  ].join(",");

  let { data: extra } = await supabase
    .from("zcasher")
    .select(extraSelect)
    .eq("id", profile.id)
    .limit(1)
    .maybeSingle();

  if (!extra) {
    const fallback = await supabase
      .from("zcasher")
      .select("is_maxi,profile_card_theme,profile_page_bkgd,profile_card_border,profile_theme_package,slug")
      .eq("id", profile.id)
      .limit(1)
      .maybeSingle();
    extra = fallback.data;
  }

  if (extra) {
    const row = extra as Record<string, unknown>;
    profile.is_maxi = row.is_maxi as Profile["is_maxi"];
    profile.profile_card_theme = row.profile_card_theme as Profile["profile_card_theme"];
    profile.profile_page_bkgd = row.profile_page_bkgd as Profile["profile_page_bkgd"];
    profile.profile_card_border = row.profile_card_border as Profile["profile_card_border"];
    profile.profile_theme_package = row.profile_theme_package as Profile["profile_theme_package"];
    if (typeof row.slug === "string") profile.slug = row.slug;
    if (typeof row.zns_name === "string" || row.zns_name === null) profile.zns_name = row.zns_name as string | null;
    if (row.zns_active !== undefined) profile.zns_active = row.zns_active as Profile["zns_active"];
    if (typeof row.zns_claim_txid === "string" || row.zns_claim_txid === null) {
      profile.zns_claim_txid = row.zns_claim_txid as string | null;
    }
    if (typeof row.maxi_source === "string" || row.maxi_source === null) {
      profile.maxi_source = row.maxi_source as Profile["maxi_source"];
    }
  }

  return mergeRanks(profile, ranks);
}

export const fetchProfileForId = cache(async function fetchProfileForId(id: number): Promise<Profile | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const data = await fetchRowById(supabase, id);
  if (!data) return null;
  return hydrateProfile(supabase, data);
});

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

  if (!profile) {
    const { data: row } = await supabase
      .from("zcasher")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    profile = row || null;
  }

  // Try username-discriminator pattern (e.g., zooko-132)
  // Only for single-dash patterns (exclude multi-dash like "my-profile-name-123")
  if (!profile) {
    const dashMatch = slug.match(PROFILE_SUFFIX_RE);
    if (dashMatch?.groups?.id && dashMatch.groups.base) {
      const id = parseInt(dashMatch.groups.id, 10);
      const username = dashMatch.groups.base;

      const data = await fetchRowById(supabase, id);

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
  return hydrateProfile(supabase, profile);
});
