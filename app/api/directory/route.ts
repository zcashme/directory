import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, withCacheHeaders } from "@/lib/api/guard";

// Fields to select - explicit, no SELECT *
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
  "verified_links_count",
  "link_search_text",
].join(",");

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
  verified_links_count: number;
  link_search_text: string | null;
}

interface DirectoryResult {
  id: number;
  name: string;
  display_name: string | null;
  address: string | null;
  address_verified: boolean;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  verified_at: string | null;
  verified_links_count: number;
}

interface DirectoryResponse {
  results: DirectoryResult[];
  exists: boolean;
  next_cursor: string | null;
}

interface ErrorResponse {
  error: string;
  results: [];
  exists: boolean;
}

const jsonResponse = (
  body: DirectoryResponse | ErrorResponse,
  status: number = 200,
  cacheSeconds: number = 0
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders({ "Content-Type": "application/json" }, cacheSeconds),
  });

const encodeCursor = (lastId: number, lastName: string): string =>
  Buffer.from(JSON.stringify({ id: lastId, name: lastName })).toString("base64");

const decodeCursor = (cursor: string): { id: number; name: string } | null => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    if (typeof decoded.id === "number" && typeof decoded.name === "string") {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};

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
    return jsonResponse({ error: "server_misconfigured", results: [], exists: false }, 500);
  }

  // Build query
  let queryBuilder = supabase
    .from("zcasher_searchable")
    .select(PROFILE_FIELDS)
    .order("name", { ascending: true })
    .limit(limit + 1); // Fetch one extra to check if there's a next page

  // Apply search filter if query provided
  if (q) {
    // Simple search: username starts with, display_name starts with, or link_search_text contains
    queryBuilder = queryBuilder.or(
      `name.ilike.${q}%,display_name.ilike.${q}%,link_search_text.ilike.%${q}%`
    );
  }

  // Apply verified filter
  if (verifiedOnly) {
    queryBuilder = queryBuilder.eq("address_verified", true);
  }

  // Apply cursor for pagination
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      // Continue from after the cursor position
      queryBuilder = queryBuilder.or(
        `name.gt.${cursorData.name},and(name.eq.${cursorData.name},id.gt.${cursorData.id})`
      );
    }
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return jsonResponse({ error: "search_failed", results: [], exists: false }, 500);
  }

  const profiles = (data || []) as unknown as DirectoryProfile[];

  // Check if there's a next page
  const hasMore = profiles.length > limit;
  const resultsToReturn = hasMore ? profiles.slice(0, limit) : profiles;

  // Calculate next cursor
  let nextCursor: string | null = null;
  if (hasMore && resultsToReturn.length > 0) {
    const lastResult = resultsToReturn[resultsToReturn.length - 1];
    nextCursor = encodeCursor(lastResult.id, lastResult.name);
  }

  // Check if exact username exists (for UI username availability)
  let exists = false;
  if (q) {
    exists = resultsToReturn.some(
      (p) => p.name.toLowerCase() === q.toLowerCase()
    );
  }

  // Transform to response format (remove link_search_text, rename last_verified_at)
  const results: DirectoryResult[] = resultsToReturn.map((p) => ({
    id: p.id,
    name: p.name,
    display_name: p.display_name,
    address: p.address,
    address_verified: p.address_verified,
    profile_image_url: p.profile_image_url,
    bio: p.bio,
    nearest_city_name: p.nearest_city_name,
    verified_at: p.last_verified_at,
    verified_links_count: p.verified_links_count,
  }));

  return jsonResponse({ results, exists, next_cursor: nextCursor }, 200, cacheSeconds);
}
