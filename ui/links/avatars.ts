// ui/links/avatars.ts
// Avatar fetching from social providers

import { getSession } from "@/lib/supabase/auth";
import { getProviderByKey } from "./providers";

/**
 * Get avatar URL from current session for a given provider.
 * Returns null if no session or provider not found.
 */
export async function getAvatarFromSession(
  providerKey: string
): Promise<string | null> {
  const { data: { session } } = await getSession();
  if (!session) return null;

  const provider = getProviderByKey(providerKey);
  if (!provider?.getAvatarUrl) return null;

  const identity = session.user.identities?.find(
    (i) => i.provider === provider.key
  );
  if (!identity) return null;

  const identityData = identity.identity_data as Record<string, unknown>;
  return provider.getAvatarUrl(identityData);
}

/**
 * Fetch GitHub avatar via public API (no auth needed).
 */
export async function fetchGithubAvatar(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(handle)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.avatar_url || null;
  } catch {
    return null;
  }
}

/**
 * Detect provider from URL and return provider key.
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

interface ApplyAvatarCallbacks {
  setAvatarPrompt: (prompt: { provider: string; url: string }) => void;
  setDeletedFields: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  handleChange: (field: string, value: string) => void;
}

/**
 * Apply avatar from a verified social link.
 * For verified links, directly fetches avatar from session or public API.
 */
export async function applyProviderAvatar(
  provider: string,
  url: string,
  callbacks: ApplyAvatarCallbacks
): Promise<void> {
  const { setAvatarPrompt, setDeletedFields, handleChange } = callbacks;

  const applyResult = (avatarUrl: string | null) => {
    if (!avatarUrl) {
      setAvatarPrompt({ provider, url });
      return;
    }
    setDeletedFields((prev) => ({ ...prev, profile_image_url: false }));
    handleChange("profile_image_url", avatarUrl);
  };

  const handle = extractHandleFromUrl(url);
  if (!handle) {
    setAvatarPrompt({ provider, url });
    return;
  }

  // GitHub: Use public API (no auth needed)
  if (provider === "GitHub" || provider === "github") {
    const avatarUrl = await fetchGithubAvatar(handle);
    applyResult(avatarUrl);
    return;
  }

  // Other providers: Get from session
  const providerKey = detectProviderFromUrl(url);
  if (!providerKey) {
    setAvatarPrompt({ provider, url });
    return;
  }

  const avatarUrl = await getAvatarFromSession(providerKey);
  applyResult(avatarUrl);
}
