import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { fetchLinksByProfileIds } from "@/lib/profile/linksRepository";
import { normalizeUsernameForCompare } from "@/lib/profile/usernamePolicy";
import { resolveZnsName } from "@/lib/zns/client";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";

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
  authenticated_links: LinkOutput[];
  unauthenticated_links: LinkOutput[];
}

interface DirectoryResponse extends Record<string, unknown> {
  results: DirectoryResult[];
  next_cursor: string | null;
  exists?: boolean;
  zns_owned?: boolean;
}

interface ZnsOwnershipCacheEntry {
  owned: boolean;
  expiresAt: number;
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

const ZNS_LOOKUP_TIMEOUT_MS = 1_200;
const ZNS_OWNERSHIP_CACHE_TTL_MS = 30_000;
const znsOwnershipCache = new Map<string, ZnsOwnershipCacheEntry>();

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

async function resolveZnsOwnershipForAvailability(name: string): Promise<boolean | undefined> {
  const znsName = normalizeZnsName(name);
  if (!isValidZnsName(znsName)) return false;

  const now = Date.now();
  const cached = znsOwnershipCache.get(znsName);
  if (cached && cached.expiresAt > now) return cached.owned;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZNS_LOOKUP_TIMEOUT_MS);

  try {
    const registration = await resolveZnsName(znsName, { signal: controller.signal });
    const owned = Boolean(registration?.address);
    znsOwnershipCache.set(znsName, {
      owned,
      expiresAt: now + ZNS_OWNERSHIP_CACHE_TTL_MS,
    });
    return owned;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeoutId);
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

    const { data: maxiRows, error: maxiError } = await supabase
      .from("zcasher")
      .select("id,is_ns,is_maxi")
      .in("id", profileIds);

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
      authenticated_links,
      unauthenticated_links,
    };
  });

  // Exact username existence for the header "is available" banner.
  let exists: boolean | undefined;
  let znsOwned: boolean | undefined;
  if (q) {
    const compareTarget = normalizeUsernameForCompare(q);
    const exactMatchInResults = resultsToReturn.some(
      (p) => normalizeUsernameForCompare(p.name) === compareTarget
    );
    if (exactMatchInResults) {
      exists = true;
    } else {
      const { data: exactRows } = await supabase
        .from("zcasher_searchable")
        .select("id,name")
        .ilike("name", q)
        .limit(20);
      exists = (exactRows ?? []).some(
        (row: { name?: string }) => normalizeUsernameForCompare(row.name ?? "") === compareTarget
      );
    }

    if (exists) {
      znsOwned = false;
    } else {
      znsOwned = await resolveZnsOwnershipForAvailability(q);
    }
  }

  const responseBody: DirectoryResponse = {
    results,
    next_cursor: nextCursor,
    exists,
    zns_owned: znsOwned,
  };
  return jsonResponse(responseBody, 200, cacheSeconds);
}
