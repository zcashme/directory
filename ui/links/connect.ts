// ui/links/connect.ts
// Initiates OAuth flow for social verification

import { supabase } from "@/lib/supabase/supabase-client";
import { PROVIDERS, ProviderKey } from "./providers";

const PENDING_CONNECT_KEY = "pendingConnect";

export interface PendingConnect {
  provider: ProviderKey;
  profileId: number;
}

export function getPendingConnect(): PendingConnect | null {
  const raw = sessionStorage.getItem(PENDING_CONNECT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_CONNECT_KEY);
  return JSON.parse(raw);
}

export async function connectSocial(
  provider: ProviderKey,
  { profileId, returnPath }: { profileId: number; returnPath: string }
): Promise<void> {
  if (!PROVIDERS[provider]) throw new Error(`Unknown provider: ${provider}`);

  const pending = { provider, profileId };
  console.log("[connectSocial] storing pending:", pending);
  sessionStorage.setItem(PENDING_CONNECT_KEY, JSON.stringify(pending));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: PROVIDERS[provider].key as any,
    options: {
      redirectTo: new URL(returnPath, window.location.origin).toString(),
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    sessionStorage.removeItem(PENDING_CONNECT_KEY);
    throw error;
  }
}
