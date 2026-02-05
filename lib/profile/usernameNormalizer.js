// lib/social/usernames.js

export const HOSTS = {
  X: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  GitHub: ["github.com", "www.github.com"],
  Instagram: ["instagram.com", "www.instagram.com"],
  Reddit: ["reddit.com", "www.reddit.com"],
  LinkedIn: ["linkedin.com", "www.linkedin.com"],
  Discord: [
    "discord.com",
    "www.discord.com",
    "discordapp.com",
    "www.discordapp.com",
    "discord.gg",
    "www.discord.gg"
  ],
  TikTok: ["tiktok.com", "www.tiktok.com"],
  Bluesky: ["bsky.app"],
  Mastodon: ["mastodon.social"],
  Snapchat: ["snapchat.com"],
  Telegram: ["t.me", "www.t.me", "telegram.me", "www.telegram.me"],
};

export function normalizeSocialUsername(raw = "", platform) {
  let v = raw.normalize("NFKC").trim();

  v = v.replace(/^https?:\/\//i, "");

  v = v.replace(/^@+/, "");

  v = v.replace(/["'\\]+/g, "");

  const hosts = HOSTS[platform];
  if (hosts) {
    for (const h of hosts) {
      if (v.startsWith(h)) {
        v = v.slice(h.length);
      }
    }
  }

  v = v.replace(/^\/+/, "");
  v = v.replace(/^(user|users|in|profile|add)\//, "");

  v = v.split("?")[0].split("#")[0];

  v = v.replace(/^(mobile\.|m\.)?(x\.com|twitter\.com)\//i, "");

  v = v.split("/")[0];

  v = v.replace(/\/+$/, "");

  v = v.replace(/[@\s]/g, "");

  return v;
}

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

export function buildSocialUrl(platform, username) {
  if (!platform || !username) return null;

  const config = PLATFORMS[platform];
  if (!config) return null;

  const prefix = config.prefix || "";
  return `${config.base}${prefix}${username}`;
}
