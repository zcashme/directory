import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { withCacheHeaders } from "@/lib/api/guard";

const CACHE_SECONDS = 60;

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
 * GET /api/zns/names/[pubkey]
 *
 * All .zcash names owned by a given Ed25519 public key (hex).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
): Promise<Response> {
  const { pubkey } = await params;

  if (!pubkey) return json({ error: "missing_pubkey" }, 400);

  const supabase = createSupabaseServerClient();
  if (!supabase) return json({ error: "service_unavailable" }, 503);

  const { data, error } = await supabase
    .from("zns")
    .select("name,unified_address,registered_at_height")
    .eq("owner_pubkey", pubkey)
    .order("registered_at_height", { ascending: true });

  if (error) return json({ error: "lookup_failed" }, 500);

  return json({
    owner_pubkey: pubkey,
    names: (data || []).map((r) => ({
      name: r.name,
      address: r.unified_address,
      registered_at_height: r.registered_at_height,
    })),
  });
}
