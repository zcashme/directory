import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, withCacheHeaders } from "@/lib/api/guard";

interface RouteParams {
  username: string;
}

const jsonResponse = (body: Record<string, unknown>, status: number, cacheSeconds: number = 0): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    }, cacheSeconds),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 300, public: true });
  if (guard instanceof Response) return guard;

  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username || "";
  const username = decodeURIComponent(String(rawUsername)).trim();

  if (!username) {
    return jsonResponse({ error: "invalid_username" }, 400);
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("id,name,display_name,address,address_verified")
    .ilike("name", username)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: "lookup_failed" }, 500);
  }

  if (!profile) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  if (!profile.address) {
    return jsonResponse({ error: "no_address" }, 404);
  }

  const verified = !!profile.address_verified;
  const displayUsername = verified
    ? profile.name
    : `${profile.name}-${profile.id}`;

  return jsonResponse(
    {
      username: displayUsername,
      display_name: profile.display_name,
      address: profile.address,
      address_verified: verified,
    },
    200,
    guard.cacheSeconds
  );
}
