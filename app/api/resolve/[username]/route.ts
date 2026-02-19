import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, withCacheHeaders } from "@/lib/api/guard";

interface ZcasherProfile {
  id: number;
  name: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  address: string | null;
  address_verified: boolean;
  last_verified_at: string | null;
}

interface ZcasherLink {
  id: number;
  label: string;
  url: string;
  platform?: string;
  is_verified: boolean;
}

interface RouteParams {
  username: string;
}

const jsonResponse = (body: Record<string, unknown>, status: number = 200, cacheSeconds: number = 0): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders({ "Content-Type": "application/json" }, cacheSeconds),
  });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 60 });
  if (guard instanceof Response) return guard;

  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username || "";
  const username = decodeURIComponent(String(rawUsername)).trim();

  if (!username) {
    return jsonResponse({ error: "invalid_username", username: null }, 400);
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse({ error: "database_unavailable", username }, 503);
  }

  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select(
      "id,name,display_name,profile_image_url,bio,nearest_city_name,address,address_verified,last_verified_at"
    )
    .ilike("name", username)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: "profile_lookup_failed", username }, 500);
  }

  if (!profile) {
    return jsonResponse({ error: "not_found", username }, 404);
  }

  const typedProfile = profile as ZcasherProfile;

  const { data: links, error: linksError } = await supabase
    .from("zcasher_links")
    .select("id,label,url,platform,is_verified")
    .eq("zcasher_id", typedProfile.id);

  if (linksError) {
    return jsonResponse({ error: "links_lookup_failed", username: typedProfile.name }, 500);
  }

  const allLinks = (links || []) as ZcasherLink[];
  const authenticated_links = allLinks.filter((link) => link.is_verified);
  const unauthenticated_links = allLinks.filter((link) => !link.is_verified);

  return jsonResponse(
    {
      username: typedProfile.name,
      display_name: typedProfile.display_name,
      profile_image_url: typedProfile.profile_image_url,
      bio: typedProfile.bio,
      nearest_city_name: typedProfile.nearest_city_name,
      address: typedProfile.address,
      address_verified: !!typedProfile.address_verified,
      verified_at: typedProfile.last_verified_at,
      authenticated_links,
      unauthenticated_links,
    },
    200,
    guard.cacheSeconds
  );
}
