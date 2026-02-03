// lib/social/providerAvatars.js
// Unified avatar logic for Discord, X, and GitHub providers

import { normalizeSocialUsername } from "@/lib/social/usernameNormalizer";
import { isValidUrl } from "@/lib/validateUrl";
import { getSession } from "@/lib/supabase/auth";

// --- Key helpers ---

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

// --- URL transforms ---

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

// --- Parse handle from URL ---

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

// --- localStorage avatar keys ---

const AVATAR_KEY_PATTERNS = [
  "discord_avatar_url:",
  "x_avatar_url:",
  "github_avatar_url:",
];

const getDiscordAvatarKey = (id, handle) => `discord_avatar_url:${id}:${handle}`;
const getXAvatarKey = (id, handle) => `x_avatar_url:${id}:${handle}`;
const getGithubAvatarKey = (id, handle) => `github_avatar_url:${id}:${handle}`;

export function getAvatarKey(provider, profileId, handle) {
  if (provider === "discord") return getDiscordAvatarKey(profileId, handle);
  if (provider === "twitter") return getXAvatarKey(profileId, handle);
  if (provider === "github") return getGithubAvatarKey(profileId, handle);
  return null;
}

export function storeAvatarUrl(provider, profileId, handle, url) {
  if (!url || !handle) return;
  const key = getAvatarKey(provider, profileId, handle);
  if (key) localStorage.setItem(key, url);
}

export function getCachedAvatarUrl(provider, profileId, handle) {
  const key = getAvatarKey(provider, profileId, handle);
  return key ? localStorage.getItem(key) : null;
}

export function clearAvatarCache(provider = null, profileId = null) {
  if (typeof window === "undefined") return { cleared: 0 };

  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const matchesProvider = !provider ||
        (provider === "discord" && key.startsWith("discord_avatar_url:")) ||
        (provider === "twitter" && key.startsWith("x_avatar_url:")) ||
        (provider === "github" && key.startsWith("github_avatar_url:"));

      const matchesProfile = !profileId || key.includes(`:${profileId}:`);

      if (matchesProvider && matchesProfile && AVATAR_KEY_PATTERNS.some((pattern) => key.startsWith(pattern))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    return { cleared: keysToRemove.length };
  } catch (error) {
    console.error("Error clearing avatar cache:", error);
    return { cleared: 0, error: error.message };
  }
}

// --- Extract handle from session identity ---

export function getXHandle(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const tw = ids.find((i) => i?.provider === "twitter")?.identity_data || {};
  const candidates = [tw.username, tw.screen_name, tw.preferred_username, tw.user_name, tw.name].filter(Boolean);
  const h = candidates.find((v) => typeof v === "string" && v.trim());
  return h ? h.replace(/^@/, "") : null;
}

export function getGithubHandle(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const gh = ids.find((i) => i?.provider === "github")?.identity_data || {};
  const candidates = [gh.user_name, gh.login, gh.preferred_username].filter(Boolean);
  const h = candidates.find((v) => typeof v === "string" && v.trim());
  return h ? h.replace(/^@/, "") : null;
}

export function getDiscordId(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const identity = ids.find((i) => i?.provider === "discord");
  const candidates = [identity?.id, identity?.identity_data?.id, identity?.identity_data?.sub].filter(Boolean);
  const h = candidates.find((v) => (typeof v === "string" || typeof v === "number") && String(v).trim());
  return h ? String(h).trim() : null;
}

export async function getDiscordUsername(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const identity = ids.find((i) => i?.provider === "discord");
  const data = identity?.identity_data || {};
  const userMeta = session?.user?.user_metadata || {};
  const username = data.username || data.preferred_username || data.user_name || data.name
    || userMeta.username || userMeta.preferred_username || userMeta.user_name || userMeta.name || userMeta.full_name || null;
  const globalName = data.global_name || userMeta.global_name || null;
  const discriminator = data.discriminator || userMeta.discriminator || null;
  const candidates = [];
  if (username) {
    candidates.push(username);
    if (discriminator && String(discriminator) != "0") {
      candidates.push(`${username}#${discriminator}`);
    }
  }
  if (globalName) candidates.push(globalName);
  const h = candidates.find((v) => typeof v === "string" && v.trim());
  if (h) return h.trim();

  const providerToken = session?.provider_token || session?.user?.provider_token || null;
  if (providerToken) {
    try {
      const res = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${providerToken}` }
      });
      if (res.ok) {
        const me = await res.json();
        const uname = me?.username || null;
        const gname = me?.global_name || null;
        const disc = me?.discriminator || null;
        if (uname) {
          if (disc && String(disc) != "0") return `${uname}#${disc}`;
          return uname;
        }
        if (gname) return gname;
      } else {
        console.warn("[VERIFY WARN] Discord /users/@me failed:", res.status);
      }
    } catch (err) {
      console.warn("[VERIFY WARN] Discord /users/@me error:", err);
    }
  }

  return null;
}

// --- Extract avatar URL from session ---

export function getXAvatarUrl(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const identity = ids.find((i) => i?.provider === "twitter");
  const data = identity?.identity_data || {};
  const userMeta = session?.user?.user_metadata || {};
  const candidates = [
    data.profile_image_url_https, data.profile_image_url, data.avatar_url,
    data.picture, data.image, userMeta.avatar_url, userMeta.picture,
    userMeta.profile_image_url, userMeta.profile_image_url_https
  ].filter(Boolean);
  const h = candidates.find((v) => typeof v === "string" && v.trim());
  return h ? upgradeXAvatarUrl(h.trim()) : null;
}

export async function getGithubAvatarUrl(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const identity = ids.find((i) => i?.provider === "github");
  const data = identity?.identity_data || {};
  const userMeta = session?.user?.user_metadata || {};
  const candidates = [data.avatar_url, data.avatar, data.picture, userMeta.avatar_url, userMeta.picture].filter(Boolean);
  const h = candidates.find((v) => typeof v === "string" && v.trim());
  if (h) return h.trim();

  const providerToken = session?.provider_token || session?.user?.provider_token || null;
  if (!providerToken) return null;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (res.ok) {
      const me = await res.json();
      return me?.avatar_url || null;
    }
  } catch (err) {
    console.warn("[VERIFY WARN] GitHub /user avatar error:", err);
  }
  return null;
}

export async function getDiscordAvatarUrl(session) {
  const ids = Array.isArray(session?.user?.identities) ? session.user.identities : [];
  const identity = ids.find((i) => i?.provider === "discord");
  const data = identity?.identity_data || {};
  const userMeta = session?.user?.user_metadata || {};
  const id = data.id || data.sub || identity?.id || userMeta.id || userMeta.sub || null;
  const avatar = data.avatar || userMeta.avatar || null;
  const direct = buildDiscordAvatarUrl(id, avatar);
  if (direct) return direct;

  const providerToken = session?.provider_token || session?.user?.provider_token || null;
  if (!providerToken) return null;
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (res.ok) {
      const me = await res.json();
      return buildDiscordAvatarUrl(me?.id, me?.avatar);
    }
  } catch (err) {
    console.warn("[VERIFY WARN] Discord /users/@me avatar error:", err);
  }
  return null;
}

// --- Apply avatar flow (used by ProfileEditor) ---

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

    let nextUrl = getCachedAvatarUrl("discord", profileId, targetKey);
    if (!nextUrl) {
      const { data: { session } } = await getSession();
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
        if (nextUrl) storeAvatarUrl("discord", profileId, targetKey, nextUrl);
      }
    }
    applyResult(nextUrl);
  } else if (provider === "X") {
    const target = parseXHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) { setAvatarPrompt({ provider, url }); return; }

    let nextUrl = getCachedAvatarUrl("twitter", profileId, targetKey);
    if (!nextUrl) {
      const { data: { session } } = await getSession();
      if (session) {
        const xHandle = getXHandle(session);
        if (!xHandle || normalizeHandleKey(xHandle) !== targetKey) {
          setAvatarPrompt({ provider, url });
          return;
        }
        nextUrl = getXAvatarUrl(session);
        if (nextUrl) storeAvatarUrl("twitter", profileId, targetKey, nextUrl);
      }
    }
    applyResult(nextUrl);
  } else if (provider === "GitHub") {
    const target = parseGithubHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) { setAvatarPrompt({ provider, url }); return; }

    let nextUrl = getCachedAvatarUrl("github", profileId, targetKey);
    if (!nextUrl) {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(targetKey)}`);
        if (res.ok) {
          const data = await res.json();
          nextUrl = data?.avatar_url || null;
          if (nextUrl) storeAvatarUrl("github", profileId, targetKey, nextUrl);
        }
      } catch (err) {
        console.warn("[VERIFY WARN] GitHub avatar fetch error:", err);
      }
    }
    applyResult(nextUrl);
  }
}

// --- URL detection/parsing (moved from ProfileEditor) ---

import { HOSTS } from "@/lib/social/usernameNormalizer";

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
