import { extractDomain } from "./domainParsing";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "./domainLabels";
import { normalizeSocialUsername } from "./normalizeSocialLink";

export const getLinkIcon = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.icon || FALLBACK_ICON;
};

export const getLinkLabel = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.label || domain || "Link";
};

const PLATFORM_BY_DOMAIN = {
  "x.com": "X",
  "twitter.com": "X",
  "github.com": "GitHub",
  "instagram.com": "Instagram",
  "reddit.com": "Reddit",
  "linkedin.com": "LinkedIn",
  "discord.com": "Discord",
  "discordapp.com": "Discord",
  "discord.gg": "Discord",
  "tiktok.com": "TikTok",
  "bsky.app": "Bluesky",
  "mastodon.social": "Mastodon",
  "snapchat.com": "Snapchat",
  "t.me": "Telegram",
  "telegram.me": "Telegram",
};

const detectPlatformFromUrl = (url = "") => {
  const domain = extractDomain(url || "");
  return PLATFORM_BY_DOMAIN[domain] || null;
};

export const getSocialHandle = (url = "") => {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";

  const platform = detectPlatformFromUrl(trimmed);
  if (platform) {
    return normalizeSocialUsername(trimmed, platform);
  }

  const cleaned = trimmed.split("#")[0].split("?")[0].replace(/\/+$/, "");
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1] || "";
  return decodeURIComponent(last);
};

export const isDiscordLink = (url = "") =>
  /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com|discord\.gg)\//i.test(
    url || ""
  );

export const getSocialDisplay = (link) => {
  if (!link) return "";
  if (isDiscordLink(link.url) && link.is_verified && link.label) {
    return link.label;
  }
  return getSocialHandle(link.url || "");
};
