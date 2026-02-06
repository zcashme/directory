// lib/social/providerAvatars.js

import { normalizeSocialUsername } from "@/lib/profile/usernameNormalizer";
import { isValidUrl } from "@/utils/validateUrl";
import { getSession } from "@/lib/supabase/auth";


export const normalizeHandleKey = (value) =>
  (value || "")
    .trim()
    .replace(/["'\\]+/g, "")
    .toLowerCase();

export const normalizeDiscordHandle = (value) =>
  (value || "")
    .trim()
    .replace(/["'\\]+/g, "")
    .replace(/^@/, "")
    .replace(/#0$/, "")
    .toLowerCase();


export const upgradeXAvatarUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim().replace(/^,+/, "");
  const withName = trimmed.replace(/([?&])name=normal\b/i, "$1name=original");
  return withName.replace(/_(normal|bigger|mini)(\.[a-z0-9]+)(\?.*)?$/i, "$2$3");
};

export const buildDiscordAvatarUrl = (id, avatar) => {
  if (!id || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=4096`;
};


export const parseXHandleFromUrl = (rawUrl) => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
  return m ? m[1].trim() : null;
};

export const parseGithubHandleFromUrl = (rawUrl) => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/github\.com\/([^/?#]+)/i);
  return m ? m[1].trim() : null;
};

export const parseDiscordTargetFromUrl = (rawUrl) => {
  const m = (rawUrl || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
};


export function getXHandle(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "twitter");
  const username = identity?.identity_data?.username;
  return username ? String(username).replace(/^@/, "") : null;
}

export function getGithubHandle(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "github");
  const login = identity?.identity_data?.login;
  return login ? String(login).replace(/^@/, "") : null;
}

export function getDiscordId(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const id = identity?.identity_data?.id;
  return id ? String(id).trim() : null;
}

export async function getDiscordUsername(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const data = identity?.identity_data || {};
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


export function getXAvatarUrl(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "twitter");
  const url = identity?.identity_data?.profile_image_url_https;
  return url ? upgradeXAvatarUrl(String(url).trim()) : null;
}

export async function getGithubAvatarUrl(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "github");
  const url = identity?.identity_data?.avatar_url;
  return url ? String(url).trim() : null;
}

export async function getDiscordAvatarUrl(session) {
  const identity = session?.user?.identities?.find?.((i) => i?.provider === "discord");
  const data = identity?.identity_data || {};
  const id = data.id;
  const avatar = data.avatar;
  return buildDiscordAvatarUrl(id, avatar);
}


export async function applyProviderAvatar(provider, url, profileId, callbacks) {
  const { setAvatarPrompt, setDeletedFields, handleChange } = callbacks;

  const applyResult = (nextUrl) => {
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
    let nextUrl = null;
    if (session) {
      const discordId = getDiscordId(session);
      const discordUsername = await getDiscordUsername(session);
      const isNumericTarget = /^[0-9]+$/.test(targetKey);
      const usernameCandidates = [discordUsername]
        .filter(Boolean)
        .flatMap((name) => {
          const normalized = normalizeDiscordHandle(name);
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
    let nextUrl = null;
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

    let nextUrl = null;
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(targetKey)}`);
      if (res.ok) {
        const data = await res.json();
        nextUrl = data?.avatar_url || null;
      }
    } catch (err) {
    }
    applyResult(nextUrl);
  }
}


import { HOSTS } from "@/lib/profile/usernameNormalizer";

export function detectPlatformFromUrl(rawUrl) {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(HOSTS)) {
      if (hosts.includes(host)) return platform;
    }
  } catch {
    return null;
  }

  return null;
}

export function parseSocialUrl(rawUrl) {
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
    username: normalizeSocialUsername(trimmed, platform),
    otherUrl: "",
  };
}

export function isValidImageUrl(url) {
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
