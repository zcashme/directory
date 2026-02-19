"use server";

// ui/links/verifyLink.ts
// Server action: auto-persist a verified social link
// Validates the OAuth session server-side before marking a link as verified.

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getProviderByKey, detectProviderFromUrl, extractHandleFromUrl } from "./providers";

const PROVIDER_TO_PLATFORM: Record<string, string> = {
  twitter: "X",
  github: "GitHub",
  discord: "Discord",
  linkedin_oidc: "LinkedIn",
};

export async function upsertVerifiedLink(
  profileId: number,
  url: string,
  accessToken: string
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
    .from("zcashers")
    .select("address_verified")
    .eq("id", profileId)
    .single();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile?.address_verified) return { ok: false, error: "Address must be verified first" };

  // Use the canonical URL built from the OAuth handle (not the client-provided URL)
  const verifiedUrl = provider.buildUrl(oauthHandle);

  const { data: existing, error: findError } = await supabase
    .from("zcasher_links")
    .select("id")
    .eq("zcasher_id", profileId)
    .eq("url", verifiedUrl)
    .maybeSingle();

  if (findError) return { ok: false, error: findError.message };

  const platform = PROVIDER_TO_PLATFORM[providerKey] ?? "Other";

  if (existing) {
    const { error } = await supabase
      .from("zcasher_links")
      .update({ is_verified: true, platform, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("zcasher_links")
      .insert({ zcasher_id: profileId, url: verifiedUrl, is_verified: true, platform, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
