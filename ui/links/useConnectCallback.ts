"use client";

// ui/links/useConnectCallback.ts
// Handles OAuth callback via onAuthStateChange + sessionStorage

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { getProviderByKey } from "./providers";
import { getPendingConnect, clearPendingConnect } from "./connect";

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
        const pending = getPendingConnect();
        if (!pending) return;
        if (pending.profileId !== profileId) return;
        if (!session) return;

        const provider = getProviderByKey(pending.provider);
        if (!provider) {
          onError?.(`Unknown provider: ${pending.provider}`);
          return;
        }

        const identity = session.user.identities?.find(
          (i) => i.provider === provider.key
        );
        if (!identity) {
          onError?.(`No ${provider.label} identity found in session`);
          return;
        }

        const data = identity.identity_data as Record<string, unknown>;
        const handle = provider.getHandle(data);
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
        clearPendingConnect();
        onConnected?.(result);
      }
    );

    return () => subscription.unsubscribe();
  }, [profileId, onConnected, onError]);
}
