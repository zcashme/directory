// Type definitions for usernameNormalizer

export type SocialPlatform = "X" | "GitHub" | "Instagram" | "Reddit" | "LinkedIn" | "Discord" | "TikTok" | "Mastodon" | "Bluesky" | "Snapchat" | "Telegram" | "Other";

export function normalizeSocialUsername(raw: string, platform: SocialPlatform): string;

export function buildSocialUrl(platform: SocialPlatform, username: string): string | null;
