// lib/social/utils.ts
// Social URL parsing and validation utilities

import { normalizeSocialUsername, HOSTS } from "@/lib/profile/usernameNormalizer";
import { isValidUrl } from "@/lib/validation/validators";

/**
 * Detect platform from a URL.
 */
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

/**
 * Parse a social URL into platform and username.
 */
export function parseSocialUrl(rawUrl: string | null | undefined): {
  platform: string;
  username: string;
  otherUrl: string;
} {
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

/**
 * Validate an image URL (must be .png or .jpg, or GitHub avatar).
 */
export function isValidImageUrl(url: string | null | undefined): {
  valid: boolean;
  reason: string | null;
} {
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
