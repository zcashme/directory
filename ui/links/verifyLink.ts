"use server";

// ui/links/verifyLink.ts
// Server action: auto-persist a verified social link
// Validates the OAuth session server-side before marking a link as verified.

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getProviderByKey, detectProviderFromUrl, extractHandleFromUrl } from "./providers";
import { downloadAndStoreAvatar } from "@/lib/profile/avatarStorage";

const PROVIDER_TO_PLATFORM: Record<string, string> = {
  twitter: "X",
  github: "GitHub",
  discord: "Discord",
  linkedin_oidc: "LinkedIn",
};

export async function upsertVerifiedLink(
  profileId: number,
  url: string,
  accessToken: string,
  username?: string,
  avatarUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase client not available" };

  // Validate the OAuth session: verify the access token and extract identities
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return { ok: false, error: "Invalid auth session" };

  // Match the claimed URL to a provider and verify the identity
  const providerKey = detectProviderFromUrl(url);
  if (!providerKey) return { ok: false, error: "Unsupported provider URL" };

  const provider = getProviderByKey(providerKey);
  if (!provider) return { ok: false, error: "Unknown provider" };

  const identity = user.identities?.find((i) => i.provider === provider.key);
  if (!identity) return { ok: false, error: "No matching OAuth identity in session" };

  const identityData = identity.identity_data as Record<string, unknown>;
  const oauthHandle = provider.getHandle(identityData);
  if (!oauthHandle) return { ok: false, error: "Could not extract handle from OAuth identity" };

  // Verify the claimed URL matches the authenticated identity
  const claimedHandle = extractHandleFromUrl(url);
  if (!claimedHandle || oauthHandle.toLowerCase() !== claimedHandle.toLowerCase()) {
    return { ok: false, error: "URL does not match authenticated identity" };
  }

  // Only address-verified profiles can authenticate social links
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("address_verified")
    .eq("id", profileId)
    .single();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile?.address_verified) return { ok: false, error: "Address must be verified first" };

  // Use the canonical URL built from the OAuth handle (not the client-provided URL)
  const verifiedUrl = provider.buildUrl(oauthHandle);
  const platform = PROVIDER_TO_PLATFORM[providerKey] ?? "Other";

  // First try exact URL match, then fall back to any link from the same platform
  const { data: exactMatch } = await supabase
    .from("zcasher_links")
    .select("id")
    .eq("zcasher_id", profileId)
    .eq("url", verifiedUrl)
    .maybeSingle();

  let existingId = exactMatch?.id ?? null;

  if (!existingId) {
    // Find any existing link from the same platform for this profile
    // (e.g. user added discord.com/users/professorshaw but OAuth gives the numeric ID)
    const { data: platformMatch } = await supabase
      .from("zcasher_links")
      .select("id")
      .eq("zcasher_id", profileId)
      .eq("platform", platform)
      .maybeSingle();
    existingId = platformMatch?.id ?? null;
  }

  // Use the OAuth username as the display label (e.g. "professorshaw" instead of numeric ID)
  const label = username || provider.getUsername?.(identityData) || "";

  if (existingId) {
    const { error } = await supabase
      .from("zcasher_links")
      .update({ url: verifiedUrl, label, is_verified: true, platform, updated_at: new Date().toISOString() })
      .eq("id", existingId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("zcasher_links")
      .insert({ zcasher_id: profileId, url: verifiedUrl, label, is_verified: true, platform, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }

  // If an OAuth avatar URL was provided and the profile has no image yet,
  // download it to the Supabase bucket and set profile_image_url.
  if (avatarUrl) {
    const { data: current } = await supabase
      .from("zcasher")
      .select("profile_image_url")
      .eq("id", profileId)
      .single();

    if (!current?.profile_image_url) {
      const dl = await downloadAndStoreAvatar(supabase, profileId, avatarUrl);
      if (dl.ok) {
        await supabase
          .from("zcasher")
          .update({ profile_image_url: dl.publicUrl })
          .eq("id", profileId);
      }
    }
  }

  return { ok: true };
}
