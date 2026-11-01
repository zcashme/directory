import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { getPublicPaymentAddress } from "@/lib/profile/profileUtils";
import { buildCanonicalSlug, resolveProfileSlug } from "@/lib/profile/usernameResolution";

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

  const resolved = await resolveProfileSlug(username);

  if (resolved.kind !== "profile") {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const profile = resolved.profile;
  if (profile.zns_resolution === "unavailable") {
    return jsonResponse({ error: "zns_unavailable", username: profile.name, zns_resolution: "unavailable" }, 503);
  }
  const paymentAddress = getPublicPaymentAddress(profile);
  if (!paymentAddress) {
    return jsonResponse({ error: "no_address" }, 404);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  const verified = !!profile.address_verified;
  const displayUsername = buildCanonicalSlug(profile, resolved.znsBound);

  const { data: links } = await supabase
    .from("zcasher_links")
    .select("platform,label,url")
    .eq("zcasher_id", profile.id)
    .eq("is_verified", true);

  return jsonResponse(
    {
      username: displayUsername,
      display_name: profile.display_name,
      address: paymentAddress,
      address_verified: verified,
      zns_active: resolved.znsBound,
      last_verified_at: profile.last_verified_at || null,
      bio: profile.bio || null,
      location: profile.nearest_city_name || null,
      profile_image_url: profile.profile_image_url || null,
      links: links || [],
    },
    200,
    guard.cacheSeconds
  );
}
