import { supabase } from "@/lib/supabase/supabase-client";
import { normalizeSlug } from "@/lib/profile/profileUtils";
import type {
  Profile,
  ProfileLink,
  PendingEdits,
  PendingEditsField,
  PendingEditValue,
} from "@/lib/profile/types";

interface AuthProvider {
  key: "twitter" | "linkedin_oidc" | "github" | "discord";
  label: string;
  match: RegExp;
  includeStateParams: boolean;
}

const AUTH_PROVIDERS: AuthProvider[] = [
  {
    key: "twitter",
    label: "X.com",
    match: /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\//i,
    includeStateParams: false,
  },
  {
    key: "linkedin_oidc",
    label: "LinkedIn",
    match: /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i,
    includeStateParams: true,
  },
  {
    key: "github",
    label: "GitHub",
    match: /^(https?:\/\/)?(www\.)?github\.com\//i,
    includeStateParams: true,
  },
  {
    key: "discord",
    label: "Discord",
    match: /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/users\//i,
    includeStateParams: true,
  },
];

const buildReturnUrl = (profile: Partial<Profile> | undefined, url: string, includeStateParams: boolean): string => {
  if (typeof window === "undefined") return "";
  const baseSlug = normalizeSlug(profile?.name || "");
  const uniqueSlug = `${baseSlug}-${profile?.id}`;
  const returnUrlObj = new URL(`${window.location.origin}/${uniqueSlug}`);
  if (includeStateParams) {
    returnUrlObj.searchParams.set("verify_pid", String(profile?.id ?? ""));
    returnUrlObj.searchParams.set("verify_url", url);
  }
  return returnUrlObj.toString();
};

const storeVerificationContext = (profileId: number | string | undefined, url: string): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("verifying_profile_id", String(profileId ?? ""));
  localStorage.setItem("verifying_link_url", url);
};

export const getAuthProviderForUrl = (url: string | undefined): AuthProvider | null => {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;
  return AUTH_PROVIDERS.find((provider) => provider.match.test(trimmed)) || null;
};

export const getLinkAuthToken = (link: Partial<ProfileLink> | null | undefined): string | null => {
  if (!link) return null;
  if (link.id) return `!${link.id}`;
  const trimmed = (link.url || "").trim();
  return trimmed ? `+!${trimmed}` : null;
};

export const isLinkAuthPending = (pendingEdits: PendingEdits | null | undefined, token: string | null): boolean =>
  Array.isArray(pendingEdits?.l) && !!token && pendingEdits.l.includes(token);

export const appendLinkToken = (
  pendingEdits: PendingEdits | null | undefined,
  setPendingEdits: (key: PendingEditsField, value: PendingEditValue) => void,
  token: string
): void => {
  const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
  const next = prev.includes(token) ? prev : [...prev, token];
  setPendingEdits("l", next);
};

export const removeLinkToken = (
  pendingEdits: PendingEdits | null | undefined,
  setPendingEdits: (key: PendingEditsField, value: PendingEditValue) => void,
  token: string
): void => {
  const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
  const next = prev.filter((t) => t !== token);
  setPendingEdits("l", next);
};

interface StartOAuthParams {
  providerKey: string;
  profile: Partial<Profile> | undefined;
  url: string;
  setShowRedirect?: (show: boolean) => void;
  setRedirectLabel?: (label: string) => void;
}

interface OAuthResult {
  status: "unknown_provider" | "missing_return" | "redirect" | "error";
}

export const startOAuthVerification = async ({
  providerKey,
  profile,
  url,
  setShowRedirect,
  setRedirectLabel,
}: StartOAuthParams): Promise<OAuthResult> => {
  const provider = AUTH_PROVIDERS.find((p) => p.key === providerKey);
  if (!provider) return { status: "unknown_provider" };

  if (typeof setShowRedirect === "function") setShowRedirect(true);
  if (typeof setRedirectLabel === "function") setRedirectLabel(provider.label);
  storeVerificationContext(profile?.id, url);

  const returnUrl = buildReturnUrl(profile, url, provider.includeStateParams);
  if (!returnUrl) {
    if (typeof setShowRedirect === "function") setShowRedirect(false);
    return { status: "missing_return" };
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider.key as any,
      options: {
        redirectTo: returnUrl,
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
    return { status: "redirect" };
  } catch (error) {
    if (typeof setShowRedirect === "function") setShowRedirect(false);
    alert("Verification failed: " + ((error as Error).message || "Unknown error"));
    return { status: "error" };
  }
};
