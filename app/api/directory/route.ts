import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { fetchLinksByProfileIds } from "@/lib/profile/linksRepository";

interface DirectoryProfile {
  id: number;
  name: string;
  display_name: string | null;
  address: string | null;
  address_verified: boolean;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  last_verified_at: string | null;
  link_search_text: string | null;
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
  is_maxi: boolean | string | number | null;
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
  is_maxi: boolean | string | number | null;
  authenticated_links: LinkOutput[];
  unauthenticated_links: LinkOutput[];
}

interface DirectoryResponse {
  results: DirectoryResult[];
  next_cursor: string | null;
  exists?: boolean;
}

interface ErrorResponse {
  error: string;
}

// Fields to select from zcasher_searchable
const PROFILE_FIELDS = [
  "id",
  "name",
  "display_name",
  "address",
  "address_verified",
  "profile_image_url",
  "bio",
  "nearest_city_name",
  "last_verified_at",
  "link_search_text",
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
  const guard = await enforceApiGuard(request, { cacheSeconds: 30 });
  if (guard instanceof Response) return guard;
  const cacheSeconds = guard.cacheSeconds;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), 100);
  const cursor = searchParams.get("cursor") || null;
  const verifiedOnly = searchParams.get("verified_only") === "true";

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  // Build query - fetch more than needed for ranking, then slice
  // When ranking, we need to fetch extra to ensure we get enough after sorting
  const fetchLimit = q ? Math.min(Math.max(limit * 12, 60), 200) : limit + 1;

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
  const maxiMap: Map<number, boolean | string | number | null> = new Map();

  if (profileIds.length > 0) {
    const { data: linksById, error: linksError } = await fetchLinksByProfileIds(supabase, profileIds);
    if (linksError) {
      return jsonResponse({ error: "links_lookup_failed" }, 500);
    }
    linksById.forEach((links, id) => linksMap.set(id, links as ZcasherLink[]));

    const { data: maxiRows, error: maxiError } = await supabase
      .from("zcasher")
      .select("id,is_maxi")
      .in("id", profileIds);

    if (maxiError) {
      return jsonResponse({ error: "maxi_lookup_failed" }, 500);
    }

    for (const row of (maxiRows || []) as ZcasherStyleRow[]) {
      maxiMap.set(row.id, row.is_maxi);
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
      is_maxi: maxiMap.get(p.id) ?? null,
      authenticated_links,
      unauthenticated_links,
    };
  });

  // Check if exact username exists (for availability checks)
  // Only check when there's a search query
  let exists: boolean | undefined;
  if (q) {
    // First check if it's in the results we already have
    const exactMatchInResults = resultsToReturn.some(
      (p) => p.name.toLowerCase() === q.toLowerCase()
    );
    if (exactMatchInResults) {
      exists = true;
    } else {
      // Query the database for exact match
      const { data: exactMatch } = await supabase
        .from("zcasher_searchable")
        .select("id")
        .ilike("name", q)
        .limit(1)
        .maybeSingle();
      exists = !!exactMatch;
    }
  }

  return jsonResponse({ results, next_cursor: nextCursor, exists }, 200, cacheSeconds);
}
