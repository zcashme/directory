import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { withCacheHeaders } from "@/lib/api/guard";

const CACHE_SECONDS = 300;

const json = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders(
      {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      status === 200 ? CACHE_SECONDS : 0
    ),
  });

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

/**
 * GET /api/zns/lookup?name=alice
 *
 * Resolve a .zec name to a Zcash address.
 * Names are case-insensitive, without the .zec suffix.
 *
 * Also supports reverse lookup:
 *   GET /api/zns/lookup?address=u1qr5e...
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawName = (searchParams.get("name") || "").trim().toLowerCase().replace(/\.zcash$/, "");
  const rawAddress = (searchParams.get("address") || "").trim();

  if (!rawName && !rawAddress) {
    return json({ error: "missing_param", detail: "Provide ?name= or ?address=" }, 400);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return json({ error: "service_unavailable" }, 503);

  // ── Forward lookup: name → address ──────────────────────────────────────
  if (rawName) {
    const { data, error } = await supabase
      .from("zns")
      .select("name,unified_address")
      .eq("name", rawName)
      .limit(1)
      .maybeSingle();

    if (error) return json({ error: "lookup_failed" }, 500);
    if (!data) return json({ error: "not_found", name: rawName }, 404);

    return json({
      name: data.name,
      address: data.unified_address,
    });
  }

  // ── Reverse lookup: address → name ──────────────────────────────────────
  const { data, error } = await supabase
    .from("zns")
    .select("name,unified_address")
    .eq("unified_address", rawAddress)
    .limit(1)
    .maybeSingle();

  if (error) return json({ error: "lookup_failed" }, 500);
  if (!data) return json({ error: "not_found", address: rawAddress }, 404);

  return json({
    name: data.name,
    address: data.unified_address,
  });
}
