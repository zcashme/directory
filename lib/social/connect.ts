// lib/social/connect.ts
// Initiates OAuth flow for social verification

import { supabase } from "@/lib/supabase/supabase-client";
import { PROVIDERS, ProviderKey } from "./providers";

export interface ConnectOptions {
  profileId: number;
  returnPath: string;
}

/**
 * Start OAuth flow to connect a social account.
 * User will be redirected to the provider, then back to returnPath with ?connect=provider&pid=profileId
 */
export async function connectSocial(
  provider: ProviderKey,
  options: ConnectOptions
): Promise<void> {
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const redirectUrl = new URL(options.returnPath, window.location.origin);
  redirectUrl.searchParams.set("connect", provider);
  redirectUrl.searchParams.set("pid", String(options.profileId));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: providerConfig.key as any,
    options: {
      redirectTo: redirectUrl.toString(),
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    throw error;
  }
}
