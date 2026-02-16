// lib/social/providers.ts
// Single source of truth for OAuth providers and handle extraction

export interface Provider {
  key: string;
  label: string;
  buildUrl: (handle: string) => string;
  getHandle: (identityData: Record<string, unknown>) => string | null;
  getUsername?: (identityData: Record<string, unknown>) => string | null;
  getAvatarUrl?: (identityData: Record<string, unknown>) => string | null;
}

export const PROVIDERS: Record<string, Provider> = {
  twitter: {
    key: "twitter",
    label: "X / Twitter",
    buildUrl: (handle) => `https://x.com/${handle}`,
    getHandle: (data) =>
      (data?.username as string) ||
      (data?.screen_name as string) ||
      (data?.user_name as string) ||
      (data?.preferred_username as string) ||
      null,
    getAvatarUrl: (data) => {
      const url = data?.profile_image_url_https as string | undefined;
      if (!url) return null;
      // Upgrade to original size
      return url
        .replace(/_(normal|bigger|mini)(\.[a-z0-9]+)(\?.*)?$/i, "$2$3")
        .replace(/([?&])name=normal\b/i, "$1name=original");
    },
  },
  github: {
    key: "github",
    label: "GitHub",
    buildUrl: (handle) => `https://github.com/${handle}`,
    getHandle: (data) => (data?.login as string) || null,
    getAvatarUrl: (data) => (data?.avatar_url as string) || null,
  },
  discord: {
    key: "discord",
    label: "Discord",
    buildUrl: (id) => `https://discord.com/users/${id}`,
    getHandle: (data) => (data?.id as string) || null,
    getUsername: (data) => {
      const username = data?.username as string | undefined;
      const discriminator = data?.discriminator as string | undefined;
      if (!username) return null;
      if (discriminator && discriminator !== "0") {
        return `${username}#${discriminator}`;
      }
      return username;
    },
    getAvatarUrl: (data) => {
      const id = data?.id as string | undefined;
      const avatar = data?.avatar as string | undefined;
      if (!id || !avatar) return null;
      return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=4096`;
    },
  },
  linkedin_oidc: {
    key: "linkedin_oidc",
    label: "LinkedIn",
    buildUrl: (handle) => `https://linkedin.com/in/${handle}`,
    getHandle: (data) =>
      (data?.vanityName as string) ||
      (data?.preferred_username as string) ||
      null,
  },
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

export function getProviderByKey(key: string): Provider | null {
  return PROVIDERS[key] || Object.values(PROVIDERS).find((p) => p.key === key) || null;
}
