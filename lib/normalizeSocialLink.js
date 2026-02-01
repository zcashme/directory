// src/utils/normalizeSocialLink.js

const HOSTS = {
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

  // Strip protocol
  v = v.replace(/^https?:\/\//i, "");

  // Strip leading @
  v = v.replace(/^@+/, "");

  // Strip quotes/backslashes that often come from pasted JSON or escaped strings
  v = v.replace(/["'\\]+/g, "");

  // Strip known platform domains
  const hosts = HOSTS[platform];
  if (hosts) {
    for (const h of hosts) {
      if (v.startsWith(h)) {
        v = v.slice(h.length);
      }
    }
  }

  // Remove common path prefixes
  v = v.replace(/^\/+/, "");
  v = v.replace(/^(user|users|in|profile|add)\//, "");

  // Strip query strings and fragments
  v = v.split("?")[0].split("#")[0];

  // Remove embedded mobile subdomains pasted into path
  v = v.replace(/^(mobile\.|m\.)?(x\.com|twitter\.com)\//i, "");

  // Keep only first path segment (no /status/, /reels/, etc)
  v = v.split("/")[0];

  // Remove trailing slashes
  v = v.replace(/\/+$/, "");

  // Block spaces and @ entirely
  v = v.replace(/[@\s]/g, "");

  return v;
}
