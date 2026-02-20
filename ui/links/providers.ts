// ui/links/providers.ts
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
      (data?.username as string) ??
      (data?.screen_name as string) ??
      (data?.user_name as string) ??
      (data?.preferred_username as string) ??
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
    getHandle: (data) => (data?.user_name as string) ?? null,
    getAvatarUrl: (data) => (data?.avatar_url as string) ?? null,
  },
  discord: {
    key: "discord",
    label: "Discord",
    buildUrl: (id) => `https://discord.com/users/${id}`,
    getHandle: (data) => (data?.sub as string) ?? (data?.provider_id as string) ?? (data?.id as string) ?? null,
    getUsername: (data) => {
      // Supabase maps Discord username to full_name (not "username")
      // name includes discriminator: "professorshaw#0"
      // full_name is clean: "professorshaw"
      return (data?.full_name as string) ?? null;
    },
    getAvatarUrl: (data) => {
      const id = (data?.sub as string) ?? (data?.provider_id as string) ?? (data?.id as string);
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
      (data?.vanityName as string) ??
      (data?.preferred_username as string) ??
      null,
  },
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

export function getProviderByKey(key: string): Provider | null {
  return PROVIDERS[key] ?? Object.values(PROVIDERS).find((p) => p.key === key) ?? null;
}

/**
 * Detect provider key from a URL.
 */
export function detectProviderFromUrl(url: string): string | null {
  const normalized = url.toLowerCase();
  if (/(?:x\.com|twitter\.com)\//.test(normalized)) return "twitter";
  if (/github\.com\//.test(normalized)) return "github";
  if (/(?:discord\.com|discordapp\.com)\/users\//.test(normalized)) return "discord";
  if (/linkedin\.com\/in\//.test(normalized)) return "linkedin_oidc";
  return null;
}

/**
 * Extract handle from a social URL.
 */
export function extractHandleFromUrl(url: string): string | null {
  const normalized = url.replace(/\/$/, "");

  // Twitter/X
  let m = normalized.match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
  if (m) return m[1];

  // GitHub
  m = normalized.match(/github\.com\/([^/?#]+)/i);
  if (m) return m[1];

  // Discord
  m = normalized.match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
  if (m) return decodeURIComponent(m[1]);

  // LinkedIn
  m = normalized.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (m) return m[1];

  return null;
}
