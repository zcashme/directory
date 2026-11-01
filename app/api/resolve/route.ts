import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { fetchLinksForProfileId } from "@/lib/profile/linksRepository";
import { getPublicPaymentAddress } from "@/lib/profile/profileUtils";
import { buildCanonicalSlug, resolveProfileSlug } from "@/lib/profile/usernameResolution";

export async function GET(request: Request): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 60 });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get("username") || "";
  const username = decodeURIComponent(String(rawUsername)).trim();

  if (!username) {
    return jsonResponse({ error: "invalid_username", username: null }, 400);
  }

  const resolved = await resolveProfileSlug(username);
  if (resolved.kind !== "profile") {
    return jsonResponse({ error: "not_found", username }, 404);
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse({ error: "server_misconfigured", username }, 500);
  }

  const typedProfile = resolved.profile;
  if (typedProfile.zns_resolution === "unavailable") {
    return jsonResponse({ error: "zns_unavailable", username: typedProfile.name, zns_resolution: "unavailable" }, 503);
  }
  const paymentAddress = getPublicPaymentAddress(typedProfile);

  const { data: allLinks, error: linksError } = await fetchLinksForProfileId(supabase, typedProfile.id);
  if (linksError) {
    return jsonResponse({ error: "links_lookup_failed", username: typedProfile.name }, 500);
  }
  const authenticated_links = allLinks.filter((l) => l.is_verified);
  const unauthenticated_links = allLinks.filter((l) => !l.is_verified);

  return jsonResponse(
    {
      username: buildCanonicalSlug(typedProfile, resolved.znsBound),
      display_name: typedProfile.display_name,
      profile_image_url: typedProfile.profile_image_url,
      bio: typedProfile.bio,
      nearest_city_name: typedProfile.nearest_city_name,
      address: paymentAddress,
      address_verified: !!typedProfile.address_verified,
      verified_at: typedProfile.last_verified_at,
      zns_active: resolved.znsBound,
      authenticated_links,
      unauthenticated_links,
    },
    200,
    guard.cacheSeconds
  );
}
