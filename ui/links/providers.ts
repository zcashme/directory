// ui/links/providers.ts
// Single source of truth for OAuth providers and handle extraction

interface Provider {
  key: string;
  label: string;
  buildUrl: (handle: string) => string;
  getHandle: (identityData: Record<string, unknown>) => string | null;
  getUsername?: (identityData: Record<string, unknown>) => string | null;
}

export type ProviderKey = "twitter" | "github" | "discord" | "linkedin_oidc";

export const PROVIDERS: Record<ProviderKey, Provider> = {
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
  },
  github: {
    key: "github",
    label: "GitHub",
    buildUrl: (handle) => `https://github.com/${handle}`,
    getHandle: (data) => (data?.user_name as string) ?? null,
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
};

const PLATFORM_TO_PROVIDER: Partial<Record<string, ProviderKey>> = {
  X: "twitter",
  GitHub: "github",
  Discord: "discord",
  LinkedIn: "linkedin_oidc",
};

export function getProviderByKey(key: string): Provider | null {
  return Object.values(PROVIDERS).find((provider) => provider.key === key) ?? null;
}

export function getProviderKeyForPlatform(platform: string | null | undefined): ProviderKey | null {
  if (!platform) return null;
  return PLATFORM_TO_PROVIDER[platform] ?? null;
}

function parseSocialUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password || parsed.port) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodePathSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded && !decoded.includes("/") ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Extract the account identifier represented by a URL for one expected
 * provider. Hostname and path checks are exact because this function is used
 * at the social-verification trust boundary.
 */
export function extractProviderHandleFromUrl(
  url: string,
  providerKey: ProviderKey,
): string | null {
  const parsed = parseSocialUrl(url);
  if (!parsed || parsed.search || parsed.hash) return null;

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (providerKey === "twitter") {
    if ((hostname !== "x.com" && hostname !== "twitter.com") || segments.length !== 1) return null;
    return decodePathSegment(segments[0]);
  }

  if (providerKey === "github") {
    if (hostname !== "github.com" || segments.length !== 1) return null;
    return decodePathSegment(segments[0]);
  }

  if (providerKey === "discord") {
    if ((hostname !== "discord.com" && hostname !== "discordapp.com") || segments.length !== 2) return null;
    if (segments[0].toLowerCase() !== "users") return null;
    return decodePathSegment(segments[1]);
  }

  if (providerKey === "linkedin_oidc") {
    if (hostname !== "linkedin.com" || segments.length !== 2) return null;
    if (segments[0].toLowerCase() !== "in") return null;
    return decodePathSegment(segments[1]);
  }

  return null;
}

/**
 * Detect provider key from a URL.
 */
export function detectProviderFromUrl(url: string): ProviderKey | null {
  for (const providerKey of Object.keys(PROVIDERS) as ProviderKey[]) {
    if (extractProviderHandleFromUrl(url, providerKey)) return providerKey;
  }
  return null;
}

/**
 * Normalize a user-entered URL or bare hostname to a canonical https://host/ form.
 * Returns null if the input cannot be parsed as a homepage URL.
 *
 * Accepts inputs like:
 *   - "example.com"
 *   - "https://example.com"
 *   - "https://Example.COM/"
 * Rejects inputs with paths, query strings, or hash fragments.
 */
export function normalizeDomainUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".")) return null;
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  if (/^[0-9.]+$/.test(host)) return null;
  if (host.startsWith("[") || host.includes(":")) return null;
  const path = parsed.pathname || "/";
  if (path !== "/" && path !== "") return null;
  if (parsed.search || parsed.hash) return null;
  return `https://${host}/`;
}

/**
 * Returns true when the URL looks like a bare custom-domain homepage
 * (verifiable via HTML rel="me"), as opposed to an OAuth provider URL or a deep link.
 *
 * Accepts both "https://example.com" and bare "example.com".
 */
export function isDomainUrl(url: string): boolean {
  if (!url) return false;
  // Reject known OAuth provider hosts before normalizing.
  if (detectProviderFromUrl(url)) return false;
  return normalizeDomainUrl(url) !== null;
}
