import type { Profile, ProfileTrust, ProfileTrustWarning, RankType } from "@/lib/profile/types";

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
 * Derives the highest-priority rank type from a profile.
 */
export function getRankType(profile: Partial<Profile>): RankType {
  if (profile.rank_alltime && profile.rank_alltime > 0) return "alltime";
  if (profile.rank_weekly && profile.rank_weekly > 0) return "weekly";
  if (profile.rank_monthly && profile.rank_monthly > 0) return "monthly";
  if (profile.rank_daily && profile.rank_daily > 0) return "daily";
  return null;
}

/**
 * Returns a Tailwind class string for the profile circle indicator.
 */
export function getCircleClass(isVerified: boolean, rankType: RankType): string {
  if (isVerified && rankType) {
    return "bg-linear-to-r from-green-400 to-orange-500";
  }
  if (isVerified) {
    return "bg-green-500";
  }
  if (rankType) {
    const map: Record<string, string> = {
      alltime: "bg-linear-to-r from-blue-500 to-red-500",
      weekly: "bg-linear-to-r from-blue-500 to-orange-500",
      monthly: "bg-linear-to-r from-blue-500 to-red-500",
      daily: "bg-linear-to-r from-blue-500 to-cyan-500",
    };
    return map[rankType] || "bg-blue-500";
  }
  return "bg-blue-500";
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
 * Builds a slug for a profile based on its name and verification status.
 */
export const buildSlug = (profile: Profile): string => {
  if (!profile?.name) return "";
  const base = normalizeSlug(profile.name);
  if (!base) return "";
  if (profile.slug) return profile.slug;
  return profile.address_verified ? base : `${base}-${profile.id}`;
};

/**
 * Builds a full shareable URL for a profile using display_name/name + origin.
 */
export const buildShareUrl = (profile: Profile): string => {
  const baseSlug = (profile.display_name || profile.name || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${profile.address_verified ? baseSlug : `${baseSlug}-${profile.id}`}`;
};
