import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { fetchLinksByProfileIds } from "@/lib/profile/linksRepository";
import { normalizeUsernameForCompare } from "@/lib/profile/usernamePolicy";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";
import { getProtectedNameInfo } from "@/lib/zns/availability";
import { ensureZnsName } from "@/lib/zns/ensure";

interface DirectoryProfile {
  id: number;
  name: string;
  display_name: string | null;
  address: string | null;
  address_verified: boolean;
  is_ns: boolean | string | number | null;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  last_verified_at: string | null;
  link_search_text: string | null;
  slug?: string | null;
  zns_active?: boolean | string | number | null;
  zns_name?: string | null;
}

interface ZcasherLink {
  id: number;
  label: string;
  url: string;
  platform?: string;
  is_verified: boolean;
  zcasher_id: number;
}

interface ZcasherStyleRow {
  id: number;
  is_ns: boolean | string | number | null;
  is_maxi: boolean | string | number | null;
  slug?: string | null;
  zns_active?: boolean | string | number | null;
  zns_name?: string | null;
}

interface LinkOutput {
  id: number;
  label: string;
  url: string;
  platform?: string;
  is_verified: boolean;
}

interface DirectoryResult {
  id: number;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  address: string | null;
  address_verified: boolean;
  verified_at: string | null;
  is_ns: boolean | string | number | null;
  is_maxi: boolean | string | number | null;
  slug?: string | null;
  zns_active?: boolean | string | number | null;
  zns_name?: string | null;
  authenticated_links: LinkOutput[];
  unauthenticated_links: LinkOutput[];
}

interface DirectoryResponse extends Record<string, unknown> {
  results: DirectoryResult[];
  next_cursor: string | null;
  exists?: boolean;
  zns_owned?: boolean;
  name_protected?: boolean;
}

// Fields to select from zcasher_searchable
const PROFILE_FIELDS = [
  "id",
  "name",
  "display_name",
  "address",
  "address_verified",
  "is_ns",
  "profile_image_url",
  "bio",
  "nearest_city_name",
  "last_verified_at",
  "link_search_text",
].join(",");

const ZNS_ENSURE_TIMEOUT_MS = 5_000;

const ZCASHER_PROFILE_FIELDS = [
  "id",
  "name",
  "display_name",
  "address",
  "address_verified",
  "is_ns",
  "profile_image_url",
  "bio",
  "nearest_city_name",
  "last_verified_at",
  "slug",
  "zns_active",
  "zns_name",
].join(",");

const encodeCursor = (lastName: string, lastId: number): string =>
  Buffer.from(JSON.stringify({ name: lastName, id: lastId })).toString("base64");

const decodeCursor = (cursor: string): { name: string; id: number } | null => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    if (typeof decoded.name === "string" && typeof decoded.id === "number") {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};

function toDirectoryProfile(row: Record<string, unknown>): DirectoryProfile | null {
  const id = Number(row.id);
  const name = typeof row.name === "string" ? row.name : "";
  if (!Number.isSafeInteger(id) || id <= 0 || !name) return null;
  return {
    id,
    name,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    address: typeof row.address === "string" ? row.address : null,
    address_verified: row.address_verified === true,
    is_ns: (row.is_ns as DirectoryProfile["is_ns"]) ?? null,
    profile_image_url: typeof row.profile_image_url === "string" ? row.profile_image_url : null,
    bio: typeof row.bio === "string" ? row.bio : null,
    nearest_city_name: typeof row.nearest_city_name === "string" ? row.nearest_city_name : null,
    last_verified_at: typeof row.last_verified_at === "string" ? row.last_verified_at : null,
    link_search_text: typeof row.link_search_text === "string" ? row.link_search_text : null,
    slug: typeof row.slug === "string" ? row.slug : null,
    zns_active: (row.zns_active as DirectoryProfile["zns_active"]) ?? null,
    zns_name: typeof row.zns_name === "string" ? row.zns_name : null,
  };
}

function prependUnique(primary: DirectoryProfile[], extra: DirectoryProfile[]): DirectoryProfile[] {
  const seen = new Set(extra.map((profile) => profile.id));
  return [...extra, ...primary.filter((profile) => !seen.has(profile.id))];
}

async function fetchExactZcasherMatches(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  query: string
): Promise<DirectoryProfile[]> {
  const name = normalizeZnsName(query) || query.trim().toLowerCase();
  if (!name) return [];
  const { data } = await supabase
    .from("zcasher")
    .select(ZCASHER_PROFILE_FIELDS)
    .or(`name.eq.${name},slug.eq.${name},zns_name.eq.${name}`)
    .limit(10);
  return (data ?? [])
    .map((row) => toDirectoryProfile(row as unknown as Record<string, unknown>))
    .filter((row): row is DirectoryProfile => Boolean(row));
}

async function fetchZcasherDirectoryProfile(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  id: number
): Promise<DirectoryProfile | null> {
  const { data } = await supabase
    .from("zcasher")
    .select(ZCASHER_PROFILE_FIELDS)
    .eq("id", id)
    .maybeSingle();
  return data ? toDirectoryProfile(data as unknown as Record<string, unknown>) : null;
}

async function ensureDirectoryZnsProfile(name: string) {
  const znsName = normalizeZnsName(name);
  if (!isValidZnsName(znsName)) return null;
  try {
    return await Promise.race([
      ensureZnsName(znsName),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ZNS_ENSURE_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Compute ranking tier for a profile based on the query.
 * Lower tier = higher priority.
 *
 * Ranking:
 *   0) Usernames that start with the query
 *   1) Usernames that contain the query
 */
function computeRankTier(profile: DirectoryProfile, query: string): number {
  const q = query.toLowerCase();
  const qNoSpace = q.replace(/\s+/g, "");
  const username = profile.name.toLowerCase();
  const usernameNoSpace = username.replace(/\s+/g, "");
  const displayName = (profile.display_name || "").toLowerCase();
  const displayNameNoSpace = displayName.replace(/\s+/g, "");
  const linkSearchText = (profile.link_search_text || "").toLowerCase();
  const linkSearchTextNoSpace = linkSearchText.replace(/\s+/g, "");

  // Tier 0: Username starts with query (space-insensitive included)
  if (username.startsWith(q) || (qNoSpace && usernameNoSpace.startsWith(qNoSpace))) return 0;

  // Tier 1: Username contains query (space-insensitive included)
  if (username.includes(q) || (qNoSpace && usernameNoSpace.includes(qNoSpace))) return 1;

  // Tier 2: Display name starts with query
  if (displayName.startsWith(q) || (qNoSpace && displayNameNoSpace.startsWith(qNoSpace))) return 2;

  // Tier 3: Display name contains query
  if (displayName.includes(q) || (qNoSpace && displayNameNoSpace.includes(qNoSpace))) return 3;

  // Tier 4: Link search text contains query
  if (linkSearchText.includes(q) || (qNoSpace && linkSearchTextNoSpace.includes(qNoSpace))) return 4;

  // Fallback (shouldn't happen if search filter worked correctly)
  return 5;
}

export async function GET(request: Request): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 30, public: true });
  if (guard instanceof Response) return guard;
  const cacheSeconds = guard.cacheSeconds;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), 100);
  const cursor = searchParams.get("cursor") || null;
  const verifiedOnly = searchParams.get("verified_only") === "true";
  const headerMode = searchParams.get("mode") === "header";

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  // Build query - fetch more than needed for ranking, then slice
  // When ranking, we need to fetch extra to ensure we get enough after sorting
  const fetchLimit = q
    ? headerMode
      ? Math.min(Math.max(limit * 6, 30), 80)
      : Math.min(Math.max(limit * 12, 60), 200)
    : limit + 1;

  let queryBuilder = supabase
    .from("zcasher_searchable")
    .select(PROFILE_FIELDS)
    .limit(fetchLimit);

  // Only order alphabetically when browsing without search query
  if (!q) {
    queryBuilder = queryBuilder.order("name", { ascending: true });
  }

  // Apply search filter if query provided
  // Matches: usernames, display names, and link handles/domains (contains)
  // Also supports space-insensitive query matching (e.g. "save zcash" -> "savezcash")
  if (q) {
    const qNoSpace = q.replace(/\s+/g, "");
    const rawClauses = [
      `name.ilike.%${q}%`,
      `display_name.ilike.%${q}%`,
      `link_search_text.ilike.%${q}%`,
    ];
    const noSpaceClauses = qNoSpace && qNoSpace !== q
      ? [
          `name.ilike.%${qNoSpace}%`,
          `display_name.ilike.%${qNoSpace}%`,
          `link_search_text.ilike.%${qNoSpace}%`,
        ]
      : [];

    queryBuilder = queryBuilder.or([...rawClauses, ...noSpaceClauses].join(","));
  }

  // Apply verified filter
  if (verifiedOnly) {
    queryBuilder = queryBuilder.eq("address_verified", true);
  }

  // Apply cursor for pagination (only for non-ranked queries)
  // For ranked queries, cursor contains rank info
  if (cursor && !q) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      queryBuilder = queryBuilder.or(
        `name.gt.${cursorData.name},and(name.eq.${cursorData.name},id.gt.${cursorData.id})`
      );
    }
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return jsonResponse({ error: "search_failed" }, 500);
  }

  let profiles = (data || []) as unknown as DirectoryProfile[];

  // Apply ranking when there's a search query
  if (q && profiles.length > 0) {
    // Compute rank for each profile and sort
    const rankedProfiles = profiles.map((profile) => ({
      profile,
      tier: computeRankTier(profile, q),
    }));

    // Sort by tier (ascending), then verified status (verified first), then username (ascending)
    rankedProfiles.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.profile.address_verified !== b.profile.address_verified) {
        return a.profile.address_verified ? -1 : 1;
      }
      return a.profile.name.localeCompare(b.profile.name);
    });

    profiles = rankedProfiles.map((r) => r.profile);

    // Handle cursor for ranked results
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData) {
        const cursorIndex = profiles.findIndex(
          (p) => p.name === cursorData.name && p.id === cursorData.id
        );
        if (cursorIndex >= 0) {
          profiles = profiles.slice(cursorIndex + 1);
        }
      }
    }
  }

  let exists: boolean | undefined;
  let znsOwned: boolean | undefined;
  let nameProtected: boolean | undefined;
  if (q) {
    const compareTarget = normalizeUsernameForCompare(q);
    const exactMatches = await fetchExactZcasherMatches(supabase, q);
    if (exactMatches.length > 0) {
      profiles = prependUnique(profiles, exactMatches);
    }

    exists = profiles.some(
      (profile) => normalizeUsernameForCompare(profile.name) === compareTarget
    );
    const protectedInfo = await getProtectedNameInfo(q);
    nameProtected = protectedInfo.kind !== "none";
    const znsName = normalizeZnsName(q);
    const hasZnsExact = profiles.some((profile) => {
      const active = profile.zns_active === true || profile.zns_active === 1
        || (typeof profile.zns_active === "string" && ["true", "yes", "1", "y", "t"].includes(profile.zns_active.trim().toLowerCase()));
      if (!active) return false;
      return (
        normalizeUsernameForCompare(profile.name) === compareTarget
        || normalizeZnsName(profile.slug ?? "") === znsName
        || normalizeZnsName(profile.zns_name ?? "") === znsName
      );
    });

    if (nameProtected) {
      znsOwned = false;
    } else if (hasZnsExact) {
      znsOwned = false;
    } else {
      const ensured = await ensureDirectoryZnsProfile(q);
      if (ensured?.resolution === "ok" && ensured.boundId) {
        const created = await fetchZcasherDirectoryProfile(supabase, ensured.boundId);
        if (created) {
          profiles = prependUnique(profiles, [created]);
          exists = true;
          znsOwned = false;
        } else {
          znsOwned = true;
        }
      } else if (ensured?.resolution === "ok") {
        znsOwned = true;
      } else if (ensured?.resolution === "unregistered") {
        znsOwned = false;
      } else {
        znsOwned = undefined;
      }
    }
  }

  // Check if there's a next page
  const hasMore = profiles.length > limit;
  const resultsToReturn = profiles.slice(0, limit);

  // Calculate next cursor
  let nextCursor: string | null = null;
  if (hasMore && resultsToReturn.length > 0) {
    const lastResult = resultsToReturn[resultsToReturn.length - 1];
    nextCursor = encodeCursor(lastResult.name, lastResult.id);
  }

  // Fetch links for all profiles in batch
  const profileIds = resultsToReturn.map((p) => p.id);
  const linksMap: Map<number, ZcasherLink[]> = new Map();
  const styleMap: Map<number, ZcasherStyleRow> = new Map();

  if (profileIds.length > 0) {
    const { data: linksById, error: linksError } = await fetchLinksByProfileIds(supabase, profileIds);
    if (linksError) {
      return jsonResponse({ error: "links_lookup_failed" }, 500);
    }
    linksById.forEach((links, id) => linksMap.set(id, links as ZcasherLink[]));

    const styled = await supabase
      .from("zcasher")
      .select("id,is_ns,is_maxi,slug,zns_active,zns_name")
      .in("id", profileIds);

    let maxiError = styled.error;
    let maxiRows: ZcasherStyleRow[] | null = (styled.data ?? null) as ZcasherStyleRow[] | null;

    if (maxiError) {
      const fallback = await supabase
        .from("zcasher")
        .select("id,is_ns,is_maxi,slug")
        .in("id", profileIds);
      maxiError = fallback.error;
      maxiRows = (fallback.data ?? null) as ZcasherStyleRow[] | null;
    }

    if (maxiError) {
      return jsonResponse({ error: "maxi_lookup_failed" }, 500);
    }

    for (const row of (maxiRows || []) as ZcasherStyleRow[]) {
      styleMap.set(row.id, row);
    }
  }

  // Transform to response format
  const results: DirectoryResult[] = resultsToReturn.map((p) => {
    const profileLinks = linksMap.get(p.id) || [];
    const authenticated_links: LinkOutput[] = profileLinks
      .filter((l) => l.is_verified)
      .map((l) => ({ id: l.id, label: l.label, url: l.url, platform: l.platform, is_verified: l.is_verified }));
    const unauthenticated_links: LinkOutput[] = profileLinks
      .filter((l) => !l.is_verified)
      .map((l) => ({ id: l.id, label: l.label, url: l.url, platform: l.platform, is_verified: l.is_verified }));
    const styleRow = styleMap.get(p.id);

    return {
      id: p.id,
      username: p.name,
      display_name: p.display_name,
      profile_image_url: p.profile_image_url,
      bio: p.bio,
      nearest_city_name: p.nearest_city_name,
      address: p.address,
      address_verified: p.address_verified,
      verified_at: p.last_verified_at,
      is_ns: styleRow?.is_ns ?? p.is_ns ?? null,
      is_maxi: styleRow?.is_maxi ?? null,
      slug: styleRow?.slug ?? null,
      zns_active: styleRow?.zns_active ?? null,
      zns_name: styleRow?.zns_name ?? null,
      authenticated_links,
      unauthenticated_links,
    };
  });

  const responseBody: DirectoryResponse = {
    results,
    next_cursor: nextCursor,
    exists,
    zns_owned: znsOwned,
    name_protected: nameProtected,
  };
  return jsonResponse(responseBody, 200, cacheSeconds);
}
