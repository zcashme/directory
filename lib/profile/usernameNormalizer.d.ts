// Type definitions for usernameNormalizer

export type SocialPlatform = "X" | "GitHub" | "Instagram" | "Reddit" | "LinkedIn" | "Discord" | "TikTok" | "Mastodon" | "Bluesky" | "Snapchat" | "Telegram" | "Other";

export function normalizeSocialUsername(_raw: string, _platform: SocialPlatform): string;

export function buildSocialUrl(_platform: SocialPlatform, _username: string): string | null;
