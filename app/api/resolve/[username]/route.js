import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { enforceApiGuard, withCacheHeaders } from "../../../../lib/api-guard";

const jsonResponse = (body, status = 200, cacheSeconds = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders({ "Content-Type": "application/json" }, cacheSeconds),
  });

export async function GET(request, { params }) {
  const guard = await enforceApiGuard(request, { cacheSeconds: 60 });
  if (guard instanceof Response) return guard;
  const rawUsername = params?.username || "";
  const username = decodeURIComponent(String(rawUsername)).trim();

  if (!username) {
    return jsonResponse({ error: "invalid_username", username: null }, 400);
  }

  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("id,name,display_name,address,address_verified,last_verified_at")
    .ilike("name", username)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: "profile_lookup_failed", username }, 500);
  }

  if (!profile) {
    return jsonResponse({ error: "not_found", username }, 404);
  }

  const { data: links, error: linksError } = await supabase
    .from("zcasher_links")
    .select("id,label,url,is_verified")
    .eq("zcasher_id", profile.id);

  if (linksError) {
    return jsonResponse({ error: "links_lookup_failed", username: profile.name }, 500);
  }

  const allLinks = links || [];
  const authenticated_links = allLinks.filter((link) => link.is_verified);
  const unauthenticated_links = allLinks.filter((link) => !link.is_verified);

  return jsonResponse(
    {
      username: profile.name,
      display_name: profile.display_name,
      address: profile.address,
      address_verified: !!profile.address_verified,
      verified_at: profile.last_verified_at,
      authenticated_links,
      unauthenticated_links,
    },
    200,
    guard.cacheSeconds
  );
}
