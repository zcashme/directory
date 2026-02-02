// --- Favicon imports & domain labels (from domainLabels.js) ---

import faviconZcashCommunity from "@/ui/assets/favicons/favicon-zcashcommunity-32.png";
import faviconYouTube from "@/ui/assets/favicons/favicon-youtube-32.png";
import faviconOdysee from "@/ui/assets/favicons/favicon-odysee-32.png";
import faviconSoundCloud from "@/ui/assets/favicons/favicon-soundcloud-32.png";
import faviconX from "@/ui/assets/favicons/favicon-x-32.png";
import faviconWeibo from "@/ui/assets/favicons/favicon-weibo-32.png";
import faviconWeChat from "@/ui/assets/favicons/favicon-wechat-32.png";
import faviconTikTok from "@/ui/assets/favicons/favicon-tiktok-32.png";
import faviconTelegram from "@/ui/assets/favicons/favicon-telegram-32.png";
import faviconSnapchat from "@/ui/assets/favicons/favicon-snapchat-32.png";
import faviconSignal from "@/ui/assets/favicons/favicon-signal-32.png";
import faviconPinterest from "@/ui/assets/favicons/favicon-pinterest-32.png";
import faviconMessenger from "@/ui/assets/favicons/favicon-messenger-32.png";
import faviconLinkedIn from "@/ui/assets/favicons/favicon-linkedin-32.png";
import faviconInstagram from "@/ui/assets/favicons/favicon-instagram-32.png";
import faviconGitHub from "@/ui/assets/favicons/favicon-github-32.png";
import faviconFacebook from "@/ui/assets/favicons/favicon-facebook-32.png";
import faviconEbay from "@/ui/assets/favicons/favicon-ebay-32.png";
import faviconDiscord from "@/ui/assets/favicons/favicon-discord-32.png";
import faviconReddit from "@/ui/assets/favicons/favicon-reddit.png";
import faviconGoogleCalendar from "@/ui/assets/favicons/favicon-google-calendar-425.png";
import fallbackGlobe from "@/ui/assets/favicons/favicon-default-globe.png";
import { normalizeSocialUsername } from "@/lib/normalizeSocialLink";

export const FALLBACK_ICON = fallbackGlobe;

export const KNOWN_DOMAINS = {
  "x.com": { label: "X", icon: faviconX },
  "twitter.com": { label: "Twitter", icon: faviconX },

  "t.me": { label: "Telegram", icon: faviconTelegram },
  "telegram.me": { label: "Telegram", icon: faviconTelegram },

  "discord.com": { label: "Discord", icon: faviconDiscord },
  "discord.gg": { label: "Discord", icon: faviconDiscord },

  "github.com": { label: "GitHub", icon: faviconGitHub },

  "youtube.com": { label: "YouTube", icon: faviconYouTube },
  "youtu.be": { label: "YouTube", icon: faviconYouTube },

  "soundcloud.com": { label: "SoundCloud", icon: faviconSoundCloud },

  "odysee.com": { label: "Odysee", icon: faviconOdysee },

  "reddit.com": { label: "Reddit", icon: faviconReddit },
  "www.reddit.com": { label: "Reddit", icon: faviconReddit },

  "facebook.com": { label: "Facebook", icon: faviconFacebook },
  "fb.com": { label: "Facebook", icon: faviconFacebook },

  "instagram.com": { label: "Instagram", icon: faviconInstagram },
  "www.instagram.com": { label: "Instagram", icon: faviconInstagram },

  "linkedin.com": { label: "LinkedIn", icon: faviconLinkedIn },
  "www.linkedin.com": { label: "LinkedIn", icon: faviconLinkedIn },

  "pinterest.com": { label: "Pinterest", icon: faviconPinterest },

  "signal.org": { label: "Signal", icon: faviconSignal },

  "snapchat.com": { label: "Snapchat", icon: faviconSnapchat },

  "wechat.com": { label: "WeChat", icon: faviconWeChat },
  "weixin.qq.com": { label: "WeChat", icon: faviconWeChat },

  "weibo.com": { label: "Weibo", icon: faviconWeibo },

  "tiktok.com": { label: "TikTok", icon: faviconTikTok },

  "messenger.com": { label: "Messenger", icon: faviconMessenger },

  "ebay.com": { label: "eBay", icon: faviconEbay },

  "zcashcommunity.com": { label: "Zcash Community Forum", icon: faviconZcashCommunity },
  "forum.zcashcommunity.com": { label: "Zcash Community Forum", icon: faviconZcashCommunity },

  "free2z.cash": { label: "Free2Z", icon: FALLBACK_ICON },

  "farcaster.xyz": { label: "Farcaster", icon: FALLBACK_ICON },

  "paywithzcash.com": { label: "PayWithZcash", icon: FALLBACK_ICON },

  "hackaday.io": { label: "Hackaday", icon: FALLBACK_ICON },
  "frankbraun.org": { label: "Frank Braun", icon: FALLBACK_ICON },

  "nakamotoinstitute.org": { label: "Nakamoto Institute", icon: FALLBACK_ICON },

  "quasa0.com": { label: "Quasa0", icon: FALLBACK_ICON },

  "gts.zebras.social": { label: "Zebras", icon: FALLBACK_ICON },

  "calendar.app.google": { label: "Google Calendar", icon: faviconGoogleCalendar },
};

// --- Domain parsing (from domainParsing.js) ---

export function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // handle malformed URLs like "x.com/y"
    const withoutProtocol = url.replace(/^https?:\/\//i, "");
    return withoutProtocol.split("/")[0].toLowerCase().replace(/^www\./, "");
  }
}

export function betweenTwoPeriods(domain) {
  if (!domain) return "";

  const parts = domain.split(".");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0];
  return parts[parts.length - 2];
}

// --- Link utilities (from linkUtils.js) ---

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

export const PLATFORM_BY_DOMAIN = {
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

export const detectPlatformFromUrl = (url = "") => {
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

// --- Enrich link (from enrichLink.js) ---

/**
 * Enriches a raw link object with a resolved label and favicon icon.
 */
export function enrichLink(link) {
  const domain = extractDomain(link.url);
  const dbLabel = (link.label || "").trim();
  const handle = getSocialHandle(link.url || "");
  const normalizedDomain = (domain || "").toLowerCase();
  const normalizedHandle = (handle || "").toLowerCase();
  const normalizedLabel = dbLabel.toLowerCase();
  const isHandleDomain =
    normalizedHandle === normalizedDomain ||
    normalizedHandle === `www.${normalizedDomain}`;
  const domainLabel = (KNOWN_DOMAINS[domain]?.label || "").toLowerCase();
  const shouldUseHandle =
    !!handle &&
    !isHandleDomain &&
    (!dbLabel ||
      normalizedLabel === normalizedDomain ||
      normalizedLabel === `www.${normalizedDomain}` ||
      normalizedLabel === domainLabel ||
      normalizedLabel.startsWith(`${normalizedDomain}/`) ||
      normalizedLabel.startsWith(`www.${normalizedDomain}/`));

  if (KNOWN_DOMAINS[domain]) {
    return {
      ...link,
      label: (shouldUseHandle ? handle : dbLabel) || KNOWN_DOMAINS[domain].label,
      icon: KNOWN_DOMAINS[domain].icon,
    };
  }

  return {
    ...link,
    label:
      (shouldUseHandle ? handle : dbLabel) ||
      betweenTwoPeriods(domain) ||
      "Unknown",
    icon: FALLBACK_ICON,
  };
}
