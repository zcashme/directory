"use client";

// ui/links/useConnectCallback.ts
// Handles a one-shot OAuth verification result via onAuthStateChange.

import { useEffect, useRef } from "react";
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
  const processingRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
        if (processingRef.current) return;

        const pending = getPendingConnect();
        if (!pending) return;
        if (pending.profileId !== profileId) return;

        if (!session?.access_token) {
          if (event === "INITIAL_SESSION") {
            clearPendingConnect();
            onError?.("Social authentication did not complete");
          }
          return;
        }

        processingRef.current = true;
        const accessToken = session.access_token;

        // Keep the auth event handler synchronous and perform the server round
        // trip after Supabase has finished notifying its subscribers.
        queueMicrotask(() => {
          void (async () => {
            try {
              const result = await verifySocialLink(
                pending.profileId,
                pending.linkId,
                accessToken,
              );
              if (!result.ok) {
                onError?.(result.error ?? "Social link verification failed");
                return;
              }
              onVerified?.(pending.linkId);
            } catch (error) {
              onError?.(error instanceof Error ? error.message : "Social link verification failed");
            } finally {
              clearPendingConnect();
              await supabase.auth.signOut({ scope: "local" });
            }
          })();
        });
      }
    );

    return () => subscription.unsubscribe();
  }, [profileId, onVerified, onError]);
}
