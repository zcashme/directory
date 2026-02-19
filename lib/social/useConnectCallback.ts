"use client";

// lib/social/useConnectCallback.ts
// Handles OAuth callback via onAuthStateChange + sessionStorage

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { getProviderByKey } from "./providers";
import { getPendingConnect } from "./connect";

export interface ConnectedLink {
  url: string;
  provider: string;
  handle: string;
  username?: string;
  avatarUrl?: string | null;
  accessToken: string;
}

interface UseConnectCallbackOptions {
  profileId: number;
  onConnected?: (link: ConnectedLink) => void;
  onError?: (error: string) => void;
}

export function useConnectCallback({
  profileId,
  onConnected,
  onError,
}: UseConnectCallbackOptions): void {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[useConnectCallback] auth event:", event);
        const pending = getPendingConnect();
        console.log("[useConnectCallback] pending:", pending);
        if (!pending) { console.log("[useConnectCallback] no pending connect, skipping"); return; }
        if (pending.profileId !== profileId) { console.log("[useConnectCallback] profileId mismatch:", pending.profileId, "vs", profileId); return; }
        if (!session) { console.log("[useConnectCallback] no session"); return; }

        const provider = getProviderByKey(pending.provider);
        if (!provider) {
          onError?.(`Unknown provider: ${pending.provider}`);
          return;
        }

        console.log("[useConnectCallback] identities:", session.user.identities?.map(i => i.provider));
        const identity = session.user.identities?.find(
          (i) => i.provider === provider.key
        );
        if (!identity) {
          onError?.(`No ${provider.label} identity found in session`);
          return;
        }

        const data = identity.identity_data as Record<string, unknown>;
        console.log("[useConnectCallback] identity_data keys:", Object.keys(data));
        const handle = provider.getHandle(data);
        console.log("[useConnectCallback] handle:", handle);
        if (!handle) {
          onError?.(`Could not get handle from ${provider.label}`);
          return;
        }

        const result = {
          url: provider.buildUrl(handle),
          provider: provider.key,
          handle,
          username: provider.getUsername?.(data) ?? handle,
          avatarUrl: provider.getAvatarUrl?.(data) ?? null,
          accessToken: session.access_token,
        };
        console.log("[useConnectCallback] success:", result);
        onConnected?.(result);
      }
    );

    return () => subscription.unsubscribe();
  }, [profileId, onConnected, onError]);
}
