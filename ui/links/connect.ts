// ui/links/connect.ts
// Initiates OAuth flow for social verification

import { supabase } from "@/lib/supabase/supabase-client";
import type { Provider as SupabaseOAuthProvider } from "@supabase/supabase-js";
import { PROVIDERS, type ProviderKey } from "./providers";

const PENDING_CONNECT_KEY = "pendingConnect";

interface PendingConnect {
  profileId: number;
  linkId: number;
}

export function getPendingConnect(): PendingConnect | null {
  const raw = sessionStorage.getItem(PENDING_CONNECT_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PendingConnect>;
    if (!Number.isSafeInteger(value.profileId) || Number(value.profileId) <= 0) {
      clearPendingConnect();
      return null;
    }
    if (!Number.isSafeInteger(value.linkId) || Number(value.linkId) <= 0) {
      clearPendingConnect();
      return null;
    }
    return { profileId: Number(value.profileId), linkId: Number(value.linkId) };
  } catch {
    clearPendingConnect();
    return null;
  }
}

export function clearPendingConnect(): void {
  sessionStorage.removeItem(PENDING_CONNECT_KEY);
}

export async function connectSocial(
  provider: ProviderKey,
  { profileId, linkId, returnPath }: { profileId: number; linkId: number; returnPath: string }
): Promise<void> {
  if (!PROVIDERS[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (!Number.isSafeInteger(profileId) || profileId <= 0) throw new Error("Invalid profile");
  if (!Number.isSafeInteger(linkId) || linkId <= 0) throw new Error("Invalid link");

  clearPendingConnect();

  // ZcashMe does not use the Supabase identity as an application login. Remove
  // any prior local auth session before beginning this one-shot proof.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) throw signOutError;

  const pending: PendingConnect = { profileId, linkId };
  sessionStorage.setItem(PENDING_CONNECT_KEY, JSON.stringify(pending));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: PROVIDERS[provider].key as SupabaseOAuthProvider,
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
