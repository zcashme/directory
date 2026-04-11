import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { enforceApiGuard, jsonResponse } from "@/lib/api/guard";
import { normalizeSocialUsername, type SocialPlatform } from "@/lib/profile/usernameNormalizer";

const PLATFORM_ALIASES: Record<string, SocialPlatform> = {
  x: "X",
  twitter: "X",
  github: "GitHub",
  instagram: "Instagram",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  discord: "Discord",
  tiktok: "TikTok",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  snapchat: "Snapchat",
  telegram: "Telegram",
};

export async function GET(request: Request): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 300 });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const rawPlatform = (searchParams.get("platform") || "").trim().toLowerCase();
  const rawHandle = searchParams.get("handle") || "";

  const platform = PLATFORM_ALIASES[rawPlatform];
  if (!platform) {
    return jsonResponse({ error: "unsupported_platform", address: null, handle: null }, 400);
  }

  const handle = normalizeSocialUsername(rawHandle, platform);
  if (!handle) {
    return jsonResponse({ error: "invalid_handle", address: null, handle: null }, 400);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ error: "server_misconfigured", address: null, handle }, 500);
  }

  // Query by platform column + handle match on label or url tail
  const { data: links, error: linksError } = await supabase
    .from("zcasher_links")
    .select("id,zcasher_id,label,url,is_verified")
    .eq("platform", platform)
    .eq("is_verified", true)
    .or(`label.ilike.${handle},url.ilike.%/${handle}`)
    .limit(25);

  if (linksError) {
    return jsonResponse({ error: "lookup_failed", address: null, handle }, 500);
  }

  if (!links || !links.length) {
    return jsonResponse({ error: "not_found", address: null, handle }, 404);
  }

  // Fetch profiles for matched links
  const ids = [...new Set(links.map((l) => l.zcasher_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("zcasher")
    .select("id,address,name,address_verified")
    .in("id", ids);

  if (profileError || !profiles?.length) {
    return jsonResponse({ error: "profile_lookup_failed", address: null, handle }, 500);
  }

  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  // Pick best: prefer verified link + verified address, then oldest profile
  const best = links
    .map((link) => ({ link, profile: profilesById.get(link.zcasher_id) }))
    .filter((c): c is { link: typeof links[0]; profile: NonNullable<typeof profiles[0]> } =>
      !!c.profile?.address
    )
    .sort((a, b) => {
      const scoreA = (a.profile.address_verified ? 1 : 0);
      const scoreB = (b.profile.address_verified ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.profile.id - b.profile.id;
    })[0];

  if (!best) {
    return jsonResponse({ error: "address_missing", address: null, handle }, 404);
  }

  return jsonResponse(
    {
      link: {
        platform: platform.toLowerCase(),
        handle,
        url: best.link.url,
        is_verified: true,
      },
      address: best.profile.address,
      profile_name: best.profile.name,
      address_verified: !!best.profile.address_verified,
    },
    200,
    guard.cacheSeconds
  );
}
