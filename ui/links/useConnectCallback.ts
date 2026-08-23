"use client";

// ui/links/useConnectCallback.ts
// Consumes the one-shot OAuth verification result after the redirect.
// connectSocial() signs out any prior local session before redirecting, so a
// pending {profileId, linkId} plus a session from getSession() can only mean
// this exact OAuth round trip completed. Pulling once cannot miss the auth
// events the previous subscription raced against during hydration.

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { getPendingConnect, clearPendingConnect } from "./connect";
import { verifySocialLink } from "./verifyLink";

interface UseConnectCallbackOptions {
  profileId: number;
  onVerified?: (linkId: number) => void;
  onError?: (error: string) => void;
}

export function useConnectCallback({
  profileId,
  onVerified,
  onError,
}: UseConnectCallbackOptions): void {
  useEffect(() => {
    const pending = getPendingConnect();
    if (!pending || pending.profileId !== profileId) return;

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          onError?.("Social authentication did not complete");
          return;
        }

        const result = await verifySocialLink(pending.profileId, pending.linkId, session.access_token);
        if (!result.ok) {
          onError?.(result.error ?? "Social link verification failed");
          return;
        }
        onVerified?.(pending.linkId);
      } finally {
        clearPendingConnect();
        await supabase.auth.signOut({ scope: "local" });
      }
    })();
  }, [profileId, onVerified, onError]);
}
