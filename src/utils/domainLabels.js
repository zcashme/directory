import faviconZcashCommunity from "../assets/favicons/favicon-zcashcommunity-32.png";
import faviconYouTube from "../assets/favicons/favicon-youtube-32.png";
import faviconX from "../assets/favicons/favicon-x-32.png";
import faviconWeibo from "../assets/favicons/favicon-weibo-32.png";
import faviconWeChat from "../assets/favicons/favicon-wechat-32.png";
import faviconTikTok from "../assets/favicons/favicon-tiktok-32.png";
import faviconTelegram from "../assets/favicons/favicon-telegram-32.png";
import faviconSnapchat from "../assets/favicons/favicon-snapchat-32.png";
import faviconSignal from "../assets/favicons/favicon-signal-32.png";
import faviconPinterest from "../assets/favicons/favicon-pinterest-32.png";
import faviconMessenger from "../assets/favicons/favicon-messenger-32.png";
import faviconLinkedIn from "../assets/favicons/favicon-linkedin-32.png";
import faviconInstagram from "../assets/favicons/favicon-instagram-32.png";
import faviconGitHub from "../assets/favicons/favicon-github-32.png";
import faviconFacebook from "../assets/favicons/favicon-facebook-32.png";
import faviconEbay from "../assets/favicons/favicon-ebay-32.png";
import faviconDiscord from "../assets/favicons/favicon-discord-32.png";
import fallbackGlobe from "../assets/favicons/favicon-default-globe.png";

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
};
