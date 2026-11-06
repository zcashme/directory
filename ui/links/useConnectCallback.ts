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
import { getOAuthCallbackError } from "./oauthCallbackError";

interface UseConnectCallbackOptions {
  profileId: number;
  onVerified?: (linkId: number, result?: { is_verified: boolean; verified_at: string | null }) => void;
  onError?: (error: string, linkId: number) => void;
}

export function useConnectCallback({
  profileId,
  onVerified,
  onError,
}: UseConnectCallbackOptions): void {
  useEffect(() => {
    const pending = getPendingConnect();
    if (!pending || pending.profileId !== profileId) return;
    const callbackError = getOAuthCallbackError(window.location.search, window.location.hash);

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          onError?.(
            callbackError ?? "Social authentication did not complete. Please try again.",
            pending.linkId,
          );
          return;
        }

        const result = await verifySocialLink(
          pending.profileId,
          pending.linkId,
          session.access_token,
          pending.intent,
        );
        if (!result.ok) {
          onError?.(result.error ?? "Social link verification failed", pending.linkId);
          return;
        }
        onVerified?.(pending.linkId, {
          is_verified: result.is_verified ?? pending.intent !== "unverify",
          verified_at: result.verified_at ?? (pending.intent === "unverify" ? null : new Date().toISOString()),
        });
      } catch {
        onError?.("Social link verification failed. Please try again.", pending.linkId);
      } finally {
        clearPendingConnect();
        await supabase.auth.signOut({ scope: "local" });
      }
    })();
  }, [profileId, onVerified, onError]);
}
