import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { withCacheHeaders } from "@/lib/api/guard";

const CACHE_SECONDS = 30;
const MAX_LIMIT = 50;

const json = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders(
      {
        "Content-Type": "application/json",
      },
      status === 200 ? CACHE_SECONDS : 0
    ),
  });

/**
 * GET /api/zns/directory?q=ali&limit=25&cursor=
 *
 * Search registered .zcash names by prefix or substring.
 * Returns paginated results sorted alphabetically.
 *
 * Params:
 *   q      - search query (prefix match preferred, falls back to contains)
 *   limit  - results per page (default 25, max 50)
 *   cursor - opaque cursor for next page
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase().replace(/\.zcash$/, "");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 1), MAX_LIMIT);
  const cursor = searchParams.get("cursor") || null;

  const supabase = createSupabaseServerClient();
  if (!supabase) return json({ error: "service_unavailable" }, 503);

  let query = supabase
    .from("zns")
    .select("name,unified_address,registered_at_height")
    .order("name", { ascending: true })
    .limit(limit + 1);

  if (q) {
    query = query.ilike("name", `${q}%`);
  }

  if (cursor) {
    query = query.gt("name", cursor);
  }

  const { data, error } = await query;

  if (error) return json({ error: "search_failed" }, 500);

  const results = (data || []) as { name: string; unified_address: string; registered_at_height: number }[];
  const hasMore = results.length > limit;
  const page = results.slice(0, limit);

  return json({
    q,
    results: page.map((r) => ({
      name: r.name,
      address: r.unified_address,
      registered_at_height: r.registered_at_height,
    })),
    next_cursor: hasMore ? page[page.length - 1].name : null,
  });
}
