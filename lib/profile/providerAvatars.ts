// lib/social/providerAvatars.ts

import { normalizeSocialUsername } from "@/lib/profile/usernameNormalizer";
import { isValidUrl } from "@/lib/profile/validateUrl";
import { getSession } from "@/lib/supabase/auth";
import type { Session } from "@supabase/supabase-js";

export const normalizeHandleKey = (value: string | null | undefined): string =>
  (value || "")
    .trim()
    .replace(/["'\\]+/g, "")
    .toLowerCase();

export const normalizeDiscordHandle = (value: string | null | undefined): string =>
  (value || "")
    .trim()
    .replace(/["'\\]+/g, "")
    .replace(/^@/, "")
    .replace(/#0$/, "")
    .toLowerCase();

export const upgradeXAvatarUrl = (url: string | null | undefined): string | null | undefined => {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim().replace(/^,+/, "");
  const withName = trimmed.replace(/([?&])name=normal\b/i, "$1name=original");
  return withName.replace(/_(normal|bigger|mini)(\.[a-z0-9]+)(\?.*)?$/i, "$2$3");
};

export const buildDiscordAvatarUrl = (id: string | null | undefined, avatar: string | null | undefined): string | null => {
  if (!id || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=4096`;
};

export const parseXHandleFromUrl = (rawUrl: string | null | undefined): string | null => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
  return m ? m[1].trim() : null;
};

export const parseGithubHandleFromUrl = (rawUrl: string | null | undefined): string | null => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/github\.com\/([^/?#]+)/i);
  return m ? m[1].trim() : null;
};

export const parseDiscordTargetFromUrl = (rawUrl: string | null | undefined): string | null => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
};

export function getXHandle(session: Session | null | undefined): string | null {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "twitter");
  const username = (identity?.identity_data as any)?.username;
  return username ? String(username).replace(/^@/, "") : null;
}

export function getGithubHandle(session: Session | null | undefined): string | null {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "github");
  const login = (identity?.identity_data as any)?.login;
  return login ? String(login).replace(/^@/, "") : null;
}

export function getDiscordId(session: Session | null | undefined): string | null {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const id = (identity?.identity_data as any)?.id;
  return id ? String(id).trim() : null;
}

export async function getDiscordUsername(session: Session | null | undefined): Promise<string | null> {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const data = (identity?.identity_data as any) || {};
  const username = data.username;
  const discriminator = data.discriminator;

  if (username) {
    if (discriminator && String(discriminator) !== "0") {
      return `${username}#${discriminator}`;
    }
    return username;
  }

  return null;
}

export function getXAvatarUrl(session: Session | null | undefined): string | null | undefined {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "twitter");
  const url = (identity?.identity_data as any)?.profile_image_url_https;
  return url ? upgradeXAvatarUrl(String(url).trim()) : null;
}

export async function getGithubAvatarUrl(session: Session | null | undefined): Promise<string | null> {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "github");
  const url = (identity?.identity_data as any)?.avatar_url;
  return url ? String(url).trim() : null;
}

export async function getDiscordAvatarUrl(session: Session | null | undefined): Promise<string | null> {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const data = (identity?.identity_data as any) || {};
  const id = data.id;
  const avatar = data.avatar;
  return buildDiscordAvatarUrl(id, avatar);
}

interface ProviderCallbacks {
  setAvatarPrompt: (prompt: { provider: string; url: string }) => void;
  setDeletedFields: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  handleChange: (field: string, value: string) => void;
}

export async function applyProviderAvatar(
  provider: string,
  url: string,
  _profileId: number | string | undefined,
  callbacks: ProviderCallbacks
): Promise<void> {
  const { setAvatarPrompt, setDeletedFields, handleChange } = callbacks;

  const applyResult = (nextUrl: string | null | undefined) => {
    if (!nextUrl) {
      setAvatarPrompt({ provider, url });
      return;
    }
    setDeletedFields((prev) => ({ ...prev, profile_image_url: false }));
    handleChange("profile_image_url", nextUrl);
  };

  if (provider === "Discord") {
    const target = parseDiscordTargetFromUrl(url);
    const targetKey = normalizeHandleKey(normalizeDiscordHandle(target));
    if (!targetKey) { setAvatarPrompt({ provider, url }); return; }

    const { data: { session } } = await getSession();
    let nextUrl: string | null = null;
    if (session) {
      const discordId = getDiscordId(session);
      const discordUsername = await getDiscordUsername(session);
      const isNumericTarget = /^[0-9]+$/.test(targetKey);
      const usernameCandidates = [discordUsername]
        .filter(Boolean)
        .flatMap((name) => {
          const normalized = normalizeDiscordHandle(name!);
          const base = normalized.replace(/#\d+$/, "");
          return [normalized, base].filter(Boolean);
        });
      const match = isNumericTarget
        ? !!discordId && String(discordId) === String(targetKey)
        : usernameCandidates.includes(targetKey);

      if (!match) { setAvatarPrompt({ provider, url }); return; }

      nextUrl = await getDiscordAvatarUrl(session);
    }
    applyResult(nextUrl);
  } else if (provider === "X") {
    const target = parseXHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) { setAvatarPrompt({ provider, url }); return; }

    const { data: { session } } = await getSession();
    let nextUrl: string | null | undefined = null;
    if (session) {
      const xHandle = getXHandle(session);
      if (!xHandle || normalizeHandleKey(xHandle) !== targetKey) {
        setAvatarPrompt({ provider, url });
        return;
      }
      nextUrl = getXAvatarUrl(session);
    }
    applyResult(nextUrl);
  } else if (provider === "GitHub") {
    const target = parseGithubHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) { setAvatarPrompt({ provider, url }); return; }

    let nextUrl: string | null = null;
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(targetKey)}`);
      if (res.ok) {
        const data = await res.json();
        nextUrl = data?.avatar_url || null;
      }
    } catch (_err) {
      // Ignore fetch errors
    }
    applyResult(nextUrl);
  }
}

import { HOSTS } from "@/lib/profile/usernameNormalizer";

export function detectPlatformFromUrl(rawUrl: string | null | undefined): string | null {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(HOSTS)) {
      if ((hosts as string[]).includes(host)) return platform;
    }
  } catch {
    return null;
  }

  return null;
}

export function parseSocialUrl(rawUrl: string | null | undefined): { platform: string; username: string; otherUrl: string } {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { platform: "X", username: "", otherUrl: "" };
  }

  const platform = detectPlatformFromUrl(trimmed);
  if (!platform) {
    return { platform: "Other", username: "", otherUrl: trimmed };
  }

  return {
    platform,
    username: normalizeSocialUsername(trimmed, platform as any),
    otherUrl: "",
  };
}

export function isValidImageUrl(url: string | null | undefined): { valid: boolean; reason: string | null } {
  if (!url) return { valid: true, reason: null };

  const trimmed = url.trim();
  const { valid } = isValidUrl(trimmed);
  if (!valid) {
    return { valid: false, reason: "Invalid URL format" };
  }

  const hasImageExt = /\.(png|jpg)(\?.*)?$/i.test(trimmed);
  let isGithubAvatar = false;
  if (!hasImageExt) {
    try {
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const u = new URL(normalized);
      isGithubAvatar = u.hostname.toLowerCase() === "avatars.githubusercontent.com";
    } catch {
      isGithubAvatar = false;
    }
  }

  if (!hasImageExt && !isGithubAvatar) {
    return { valid: false, reason: "Image URL must end in .png or .jpg" };
  }

  return { valid: true, reason: null };
}
