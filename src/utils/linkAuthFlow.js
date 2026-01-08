import { supabase } from "../supabase";

const AUTH_PROVIDERS = [
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

const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

const buildReturnUrl = (profile, url, includeStateParams) => {
  if (typeof window === "undefined") return "";
  const baseSlug = normalizeSlug(profile?.name || "");
  const uniqueSlug = `${baseSlug}-${profile?.id}`;
  const returnUrlObj = new URL(`${window.location.origin}/${uniqueSlug}`);
  if (includeStateParams) {
    returnUrlObj.searchParams.set("verify_pid", profile?.id);
    returnUrlObj.searchParams.set("verify_url", url);
  }
  return returnUrlObj.toString();
};

const storeVerificationContext = (profileId, url) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("verifying_profile_id", profileId);
  localStorage.setItem("verifying_link_url", url);
};

export const getAuthProviderForUrl = (url) => {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;
  return AUTH_PROVIDERS.find((provider) => provider.match.test(trimmed)) || null;
};

export const getLinkAuthToken = (link) => {
  if (!link) return null;
  if (link.id) return `!${link.id}`;
  const trimmed = (link.url || "").trim();
  return trimmed ? `+!${trimmed}` : null;
};

export const isLinkAuthPending = (pendingEdits, token) =>
  Array.isArray(pendingEdits?.l) && pendingEdits.l.includes(token);

export const appendLinkToken = (pendingEdits, setPendingEdits, token) => {
  const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
  const next = prev.includes(token) ? prev : [...prev, token];
  setPendingEdits("l", next);
};

export const removeLinkToken = (pendingEdits, setPendingEdits, token) => {
  const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
  const next = prev.filter((t) => t !== token);
  setPendingEdits("l", next);
};

export const startOAuthVerification = async ({
  providerKey,
  profile,
  url,
  setShowRedirect,
  setRedirectLabel,
}) => {
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
      provider: provider.key,
      options: {
        redirectTo: returnUrl,
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
    return { status: "redirect" };
  } catch (error) {
    console.error("OAuth error:", error);
    if (typeof setShowRedirect === "function") setShowRedirect(false);
    alert("Verification failed: " + (error.message || "Unknown error"));
    return { status: "error" };
  }
};

