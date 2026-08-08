import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";

interface RouteParams {
  username: string;
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
    .select("id,name,display_name,address,address_verified,bio,location,profile_image_url,last_verified_at")
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

  const { data: links } = await supabase
    .from("zcasher_links")
    .select("platform,label,url")
    .eq("zcasher_id", profile.id)
    .eq("is_verified", true);

  return jsonResponse(
    {
      username: displayUsername,
      display_name: profile.display_name,
      address: profile.address,
      address_verified: verified,
      last_verified_at: profile.last_verified_at || null,
      bio: profile.bio || null,
      location: profile.location || null,
      profile_image_url: profile.profile_image_url || null,
      links: links || [],
    },
    200,
    guard.cacheSeconds
  );
}
