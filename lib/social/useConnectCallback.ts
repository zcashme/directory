"use client";

// lib/social/useConnectCallback.ts
// Handles OAuth callback after social connection

import { useEffect, useCallback } from "react";
import { getSession } from "@/lib/supabase/auth";
import { getProviderByKey } from "./providers";

export interface ConnectedLink {
  url: string;
  provider: string;
  handle: string;
  username?: string;
  avatarUrl?: string | null;
}

interface UseConnectCallbackOptions {
  profileId: number;
  onConnected?: (link: ConnectedLink) => void;
  onError?: (error: string) => void;
}

/**
 * Hook that handles the OAuth callback after connecting a social account.
 * Extracts handle from session, builds URL, and saves verified link.
 */
export function useConnectCallback({
  profileId,
  onConnected,
  onError,
}: UseConnectCallbackOptions): void {
  const handleCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const providerKey = params.get("connect");
    const pid = params.get("pid");

    // Not a connect callback
    if (!providerKey) return;

    // Profile ID mismatch
    if (pid && String(pid) !== String(profileId)) return;

    const provider = getProviderByKey(providerKey);
    if (!provider) {
      onError?.(`Unknown provider: ${providerKey}`);
      cleanUrl();
      return;
    }

    const { data: { session } } = await getSession();
    if (!session) {
      onError?.("No session found after OAuth");
      cleanUrl();
      return;
    }

    const identity = session.user.identities?.find(
      (i) => i.provider === provider.key
    );

    if (!identity) {
      onError?.(`No ${provider.label} identity found in session`);
      cleanUrl();
      return;
    }

    const identityData = identity.identity_data as Record<string, unknown>;
    const handle = provider.getHandle(identityData);

    if (!handle) {
      onError?.(`Could not get handle from ${provider.label}`);
      cleanUrl();
      return;
    }

    const url = provider.buildUrl(handle);
    const username = provider.getUsername?.(identityData) ?? handle;
    const avatarUrl = provider.getAvatarUrl?.(identityData) ?? null;

    // Notify caller - link goes to local state, written to DB after OTP verification
    onConnected?.({
      url,
      provider: provider.key,
      handle,
      username,
      avatarUrl,
    });

    cleanUrl();
  }, [profileId, onConnected, onError]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);
}

function cleanUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("connect");
  url.searchParams.delete("pid");
  window.history.replaceState({}, "", url.toString());
}
