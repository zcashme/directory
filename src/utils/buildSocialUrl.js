// src/utils/buildSocialUrl.js

export function buildSocialUrl(platform, username) {
  if (!platform || !username) return null;

  const PLATFORMS = {
    X: { base: "https://x.com/" },
    GitHub: { base: "https://github.com/" },
    Instagram: { base: "https://instagram.com/" },
    Reddit: { base: "https://reddit.com/user/" },
    LinkedIn: { base: "https://linkedin.com/in/" },
    Discord: { base: "https://discord.com/users/" },
    TikTok: { base: "https://tiktok.com/", prefix: "@" },
    Mastodon: { base: "https://mastodon.social/", prefix: "@" },
    Bluesky: { base: "https://bsky.app/profile/" },
    Snapchat: { base: "https://snapchat.com/add/" },
    Telegram: { base: "https://t.me/" },
  };

  const config = PLATFORMS[platform];
  if (!config) return null;

  const prefix = config.prefix || "";
  return `${config.base}${prefix}${username}`;
}
