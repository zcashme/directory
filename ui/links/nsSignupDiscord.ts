"use client";

import { supabase } from "@/lib/supabase/supabase-client";

const NS_SIGNUP_DISCORD_PENDING_KEY = "nsSignupDiscordPending";

interface PendingNsSignupDiscord {
  returnPath: string;
}

export function hasPendingNsSignupDiscord(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(NS_SIGNUP_DISCORD_PENDING_KEY);
}

export function getPendingNsSignupDiscord(): PendingNsSignupDiscord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(NS_SIGNUP_DISCORD_PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingNsSignupDiscord;
  } catch {
    sessionStorage.removeItem(NS_SIGNUP_DISCORD_PENDING_KEY);
    return null;
  }
}

export function clearPendingNsSignupDiscord(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NS_SIGNUP_DISCORD_PENDING_KEY);
}

export async function connectDiscordForNsSignup(returnPath: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Discord login is only available in the browser.");
  }

  const pending: PendingNsSignupDiscord = { returnPath };
  sessionStorage.setItem(NS_SIGNUP_DISCORD_PENDING_KEY, JSON.stringify(pending));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: new URL(returnPath, window.location.origin).toString(),
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    sessionStorage.removeItem(NS_SIGNUP_DISCORD_PENDING_KEY);
    throw error;
  }
}
