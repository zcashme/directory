"use server";

// ui/links/verifyLink.ts
// Server action: verify one exact, existing social link.

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import {
  extractProviderHandleFromUrl,
  getProviderByKey,
  getProviderKeyForPlatform,
} from "./providers";

function handlesMatch(expected: string, actual: string): boolean {
  return expected.toLocaleLowerCase("en-US") === actual.toLocaleLowerCase("en-US");
}

export async function verifySocialLink(
  profileId: number,
  linkId: number,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    return { ok: false, error: "Invalid profile" };
  }
  if (!Number.isSafeInteger(linkId) || linkId <= 0) {
    return { ok: false, error: "Invalid link" };
  }
  if (!accessToken) return { ok: false, error: "Invalid auth session" };

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase client not available" };

  // The database row, not callback data, defines the challenged social claim.
  const { data: storedLink, error: linkError } = await supabase
    .from("zcasher_links")
    .select("id, zcasher_id, url, platform, is_verified")
    .eq("id", linkId)
    .eq("zcasher_id", profileId)
    .single();

  if (linkError || !storedLink) return { ok: false, error: "Social link not found" };
  if (storedLink.is_verified !== false) {
    return { ok: false, error: "Social link is already verified" };
  }

  const providerKey = getProviderKeyForPlatform(storedLink.platform);
  if (!providerKey) return { ok: false, error: "Unsupported social link platform" };

  const provider = getProviderByKey(providerKey);
  if (!provider) return { ok: false, error: "Unknown provider" };

  const expectedHandle = extractProviderHandleFromUrl(storedLink.url, providerKey);
  if (!expectedHandle) {
    return { ok: false, error: "Stored URL does not match its social platform" };
  }

  // Only address-verified profiles can authenticate social links.
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("address_verified")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) return { ok: false, error: "Profile not found" };
  if (!profile.address_verified) return { ok: false, error: "Address must be verified first" };

  // Ask Supabase to validate the returned session and identify the provider account.
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return { ok: false, error: "Invalid auth session" };

  const identity = user.identities?.find((i) => i.provider === provider.key);
  if (!identity) return { ok: false, error: "No matching OAuth identity in session" };

  const identityData = identity.identity_data as Record<string, unknown>;
  const oauthIdentifiers = [
    provider.getHandle(identityData),
    provider.getUsername?.(identityData) ?? null,
  ].filter((value): value is string => !!value);

  if (!oauthIdentifiers.some((identifier) => handlesMatch(expectedHandle, identifier))) {
    return { ok: false, error: "Stored social link does not match authenticated identity" };
  }

  // Reassert every challenged-row invariant in the update so a concurrent
  // profile edit cannot redirect the proof to a changed or different row.
  const { data: verifiedLink, error: updateError } = await supabase
    .from("zcasher_links")
    .update({ is_verified: true })
    .eq("id", linkId)
    .eq("zcasher_id", profileId)
    .eq("url", storedLink.url)
    .eq("platform", storedLink.platform)
    .eq("is_verified", false)
    .select("id")
    .maybeSingle();

  if (updateError) return { ok: false, error: updateError.message };
  if (!verifiedLink) {
    return { ok: false, error: "Social link changed during verification" };
  }

  return { ok: true };
}
