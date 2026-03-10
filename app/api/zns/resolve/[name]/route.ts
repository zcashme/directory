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
 * GET /api/zns/resolve/[name]
 *
 * Resolve a .zcash name to a Zcash unified address.
 * Name is case-insensitive, .zcash suffix is stripped automatically.
 *
 * Example: GET /api/zns/resolve/alice
 *          GET /api/zns/resolve/alice.zcash
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<Response> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).trim().toLowerCase().replace(/\.zcash$/, "");

  if (!name) return json({ error: "invalid_name" }, 400);

  const supabase = createSupabaseServerClient();
  if (!supabase) return json({ error: "service_unavailable" }, 503);

  const { data, error } = await supabase
    .from("zns")
    .select("name,unified_address,smt_root,merkle_proof")
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error) return json({ error: "lookup_failed" }, 500);
  if (!data) return json({ error: "not_found", name }, 404);

  return json({
    name: data.name,
    address: data.unified_address,
    smt_root: data.smt_root,
    merkle_proof: data.merkle_proof,
  });
}
