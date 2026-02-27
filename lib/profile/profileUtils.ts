import type { Profile, ProfileTrust, ProfileTrustWarning } from "@/lib/profile/types";

/**
 * Derives trust-state booleans from a profile object.
 */
export function getProfileTrust(profile: Partial<Profile>): ProfileTrust {
  const verifiedAddress = !!profile.address_verified;

  const verifiedLinks = typeof profile.verified_links_count === "number"
    ? profile.verified_links_count
    : (profile.links?.filter((l) => l.is_verified).length || 0);

  const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
  const isVerified = hasVerifiedContent;
  const canAuthenticateLinks = !!profile.address_verified;

  return { verifiedAddress, verifiedLinks, hasVerifiedContent, isVerified, canAuthenticateLinks };
}

interface WarningConfigParams {
  profile: Profile;
  warning: boolean;
  verifiedAddress: boolean;
  verifiedLinks: number;
  totalLinks: number;
  hasDuplicateNames: boolean;
}

/**
 * Computes warning configuration from profile trust state.
 *
 * Returns an object with { tone, summary, toggleLabel, defaultExpanded, details }
 * where `details` is an array of plain strings.
 *
 * Returns null if no warning should be shown.
 */
export function getWarningConfig({ profile, warning, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames }: WarningConfigParams): ProfileTrustWarning | null {
  if (!warning) return null;

  const name = profile?.display_name || profile?.name || "This profile";
  const hasLinks = totalLinks > 0;
  const hasAuthenticatedLinks = verifiedLinks > 0;

  if (!verifiedAddress) {
    if (!hasLinks && hasDuplicateNames) {
      return {
        tone: "red",
        summary: `\u26A0 ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        defaultExpanded: false,
        details: [
          "Multiple profiles use this name.",
          "No links are available to verify that this address belongs to the same person.",
        ],
      };
    }

    if (!hasLinks) {
      return {
        tone: "red",
        summary: `\u26A0 ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        details: [
          "No links are available to verify that this address belongs to the same person.",
          "Names can be impersonated.",
        ],
      };
    }

    if (hasDuplicateNames) {
      return {
        tone: "yellow",
        summary: `\u26A0 ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        details: [
          "Multiple profiles use this name.",
          "Links are provided but their ownership has not been authenticated.",
        ],
      };
    }

    return {
      tone: "yellow",
      summary: `\u26A0 ${name} may not be who you think.`,
      toggleLabel: "Warnings",
      details: [
        "Links are provided but their ownership has not been authenticated.",
        "Names can be impersonated.",
      ],
    };
  }

  if (!hasLinks) {
    return {
      tone: "yellow",
      summary: "\u26A0 This address was recently active.",
      toggleLabel: "Warnings",
      details: [
        "No links are available to verify that this address belongs to the same person.",
        "Names can be impersonated.",
      ],
    };
  }

  if (hasAuthenticatedLinks) {
    return {
      tone: "positive",
      summary: "This address was recently active.",
      toggleLabel: "More",
      details: [
        "Authenticated links help confirm address belongs to same person.",
        "Names can be impersonated.",
      ],
    };
  }

  return {
    tone: "neutral",
    summary: "This address was recently active.",
    toggleLabel: "Caution",
    details: [
      "Links are provided to help verify identity, but ownership has not been authenticated.",
      "Names can be impersonated.",
    ],
  };
}

/**
 * Appends a cache-busting query param to profile image URLs.
 * Skips Twitter avatar URLs (pbs.twimg.com) and URLs that already have query params.
 */
export function isNewProfile(profile: Profile): boolean {
  const todayUTC = new Date().toISOString().slice(0, 10);
  return (profile.since || "").slice(0, 10) === todayUTC;
}

/**
 * Converts a verification timestamp or profile object to a human-readable "time ago" string.
 * Accepts either a timestamp string/number or a profile object with last_verified_at.
 */
export function getLastVerifiedLabel(input: string | number | Profile | null | undefined): string {
  const ts = typeof input === 'object' ? input?.last_verified_at : input;
  if (!ts) return "n/a";
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return "n/a";
  const weeks = (Date.now() - ms) / (1000 * 60 * 60 * 24 * 7);
  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
}

/**
 * Normalizes a string value into a URL-friendly slug format.
 */
export const normalizeSlug = (value: string = ""): string =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

/**
 * Returns true only when the profile's username is explicitly verified.
 */
export const isUsernameVerified = (profile: Partial<Profile> | null | undefined): boolean =>
  profile?.address_verified === true;

/**
 * Returns the username display value with discriminator for unverified names.
 */
export const getUsernameWithDiscriminator = (
  profile: Partial<Profile> | null | undefined
): string => {
  const base = (profile?.name || "").trim();
  if (!base) return "";
  if (isUsernameVerified(profile)) return base;
  return typeof profile?.id === "number" ? `${base}-${profile.id}` : base;
};

/**
 * Returns the canonical profile slug using username + discriminator rule.
 */
export const buildSlug = (profile: Partial<Profile> | null | undefined): string => {
  if (!profile?.name) return "";
  const base = normalizeSlug((profile.name || "").trim());
  if (!base) return "";
  if (isUsernameVerified(profile)) {
    return profile.slug || base;
  }
  return typeof profile.id === "number" ? `${base}-${profile.id}` : base;
};

/**
 * Builds a full shareable URL for a profile using display_name/name + origin.
 */
export const buildShareUrl = (profile: Profile): string => {
  const slug = buildSlug(profile);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${slug}`;
};
