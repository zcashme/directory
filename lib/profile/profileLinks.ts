import faviconZcashCommunity from "@/lib/profile/assets/favicons/favicon-zcashcommunity-32.png";
import faviconYouTube from "@/lib/profile/assets/favicons/favicon-youtube-32.png";
import faviconOdysee from "@/lib/profile/assets/favicons/favicon-odysee-32.png";
import faviconSoundCloud from "@/lib/profile/assets/favicons/favicon-soundcloud-32.png";
import faviconX from "@/lib/profile/assets/favicons/favicon-x-32.png";
import faviconWeibo from "@/lib/profile/assets/favicons/favicon-weibo-32.png";
import faviconWeChat from "@/lib/profile/assets/favicons/favicon-wechat-32.png";
import faviconTikTok from "@/lib/profile/assets/favicons/favicon-tiktok-32.png";
import faviconTelegram from "@/lib/profile/assets/favicons/favicon-telegram-32.png";
import faviconSnapchat from "@/lib/profile/assets/favicons/favicon-snapchat-32.png";
import faviconSignal from "@/lib/profile/assets/favicons/favicon-signal-32.png";
import faviconPinterest from "@/lib/profile/assets/favicons/favicon-pinterest-32.png";
import faviconMessenger from "@/lib/profile/assets/favicons/favicon-messenger-32.png";
import faviconLinkedIn from "@/lib/profile/assets/favicons/favicon-linkedin-32.png";
import faviconInstagram from "@/lib/profile/assets/favicons/favicon-instagram-32.png";
import faviconGitHub from "@/lib/profile/assets/favicons/favicon-github-32.png";
import faviconFacebook from "@/lib/profile/assets/favicons/favicon-facebook-32.png";
import faviconEbay from "@/lib/profile/assets/favicons/favicon-ebay-32.png";
import faviconDiscord from "@/lib/profile/assets/favicons/favicon-discord-32.png";
import faviconReddit from "@/lib/profile/assets/favicons/favicon-reddit.png";
import faviconGoogleCalendar from "@/lib/profile/assets/favicons/favicon-google-calendar-425.png";
import fallbackGlobe from "@/lib/profile/assets/favicons/favicon-default-globe.png";
import { normalizeSocialUsername } from "@/lib/profile/usernameNormalizer";
import type { Profile, ProfileLink, EnrichedProfileLink, ProfileLinks } from "@/lib/profile/types";
import type { StaticImageData } from "next/image";

export const FALLBACK_ICON = fallbackGlobe;

interface DomainConfig {
  label: string;
  icon: StaticImageData;
}

const KNOWN_DOMAINS: Record<string, DomainConfig> = {
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
} as const;


export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    // Decode to ensure consistent output between server/client
    return decodeURIComponent(u.hostname).toLowerCase().replace(/^www\./, "");
  } catch {
    const withoutProtocol = url.replace(/^https?:\/\//i, "");
    const domain = withoutProtocol.split("/")[0].toLowerCase().replace(/^www\./, "");
    // Decode any percent-encoded characters for consistency
    try {
      return decodeURIComponent(domain);
    } catch {
      return domain;
    }
  }
}

export const getLinkIcon = (url: string = ""): StaticImageData => {
  const domain = extractDomain(url ?? "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.icon ?? FALLBACK_ICON;
};

export const getLinkLabel = (url: string = ""): string => {
  const domain = extractDomain(url ?? "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.label ?? domain ?? "Link";
};

type SocialPlatform = "X" | "GitHub" | "Instagram" | "Reddit" | "LinkedIn" | "Discord" | "TikTok" | "Bluesky" | "Mastodon" | "Snapchat" | "Telegram";

const PLATFORM_BY_DOMAIN: Record<string, SocialPlatform> = {
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
} as const;

/**
 * Derive the platform label from a URL using PLATFORM_BY_DOMAIN.
 * Returns "Other" if the domain is not recognized.
 */
export function derivePlatform(url: string): string {
  const domain = extractDomain(url);
  return PLATFORM_BY_DOMAIN[domain] ?? "Other";
}

export const getSocialHandle = (url: string = "", platform?: string | null): string => {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";

  if (platform && platform !== "Other") {
    return normalizeSocialUsername(trimmed, platform as import("@/lib/profile/usernameNormalizer").SocialPlatform);
  }

  const cleaned = trimmed.split("#")[0].split("?")[0].replace(/\/+$/, "");
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1] ?? "";
  return decodeURIComponent(last);
};

export const getSocialDisplay = (link: ProfileLink): string => {
  if (!link) return "";
  if (link.platform === "Discord" && link.is_verified && link.label) {
    return link.label;
  }
  return getSocialHandle(link.url ?? "", link.platform);
};


/**
 * Enriches a raw link object with a resolved label and favicon icon.
 */
export function enrichLink(link: ProfileLink): EnrichedProfileLink {
  const domain = extractDomain(link.url);
  const dbLabel = (link.label ?? "").trim();
  const handle = getSocialHandle(link.url ?? "", link.platform);
  const normalizedDomain = (domain ?? "").toLowerCase();
  const normalizedHandle = (handle ?? "").toLowerCase();
  const normalizedLabel = dbLabel.toLowerCase();
  const isHandleDomain =
    normalizedHandle === normalizedDomain ||
    normalizedHandle === `www.${normalizedDomain}`;
  const domainLabel = (KNOWN_DOMAINS[domain]?.label ?? "").toLowerCase();
  const shouldUseHandle =
    !!handle &&
    !isHandleDomain &&
    (!dbLabel ||
      normalizedLabel === normalizedDomain ||
      normalizedLabel === `www.${normalizedDomain}` ||
      normalizedLabel === domainLabel ||
      normalizedLabel.startsWith(`${normalizedDomain}/`) ||
      normalizedLabel.startsWith(`www.${normalizedDomain}/`));

  const platform = link.platform ?? null;

  if (KNOWN_DOMAINS[domain]) {
    return {
      ...link,
      label: (shouldUseHandle ? handle : dbLabel) ?? KNOWN_DOMAINS[domain].label,
      icon: KNOWN_DOMAINS[domain].icon,
      domain,
      handle,
      platform,
    };
  }

  // For authenticated custom-domain links (verified via the rel="me" flow),
  // use the domain's own favicon instead of the generic fallback icon.
  const useDomainFavicon = !!domain && !!link.is_verified;
  const icon = useDomainFavicon ? buildFaviconUrl(domain!) : FALLBACK_ICON;

  return {
    ...link,
    label:
      (shouldUseHandle ? handle : dbLabel) ??
      domain ??
      "Unknown",
    icon,
    domain,
    handle,
    platform,
  };
}

/**
 * Returns a favicon URL for an arbitrary domain via Google's S2 favicon service.
 * Used for authenticated custom-domain links.
 */
function buildFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/**
 * Parses and enriches links from a profile object.
 */
export function parseProfileLinks(profile: Profile): ProfileLinks {
  const rawLinks = Array.isArray(profile.links) ? profile.links : [];

  const linksArray = rawLinks
    .map(link => enrichLink(link))
    .filter(link => link && link.url);

  return {
    linksArray,
    totalLinks: profile.total_links ?? linksArray.length,
  };
}
