/**
 * Derives trust-state booleans from a profile object.
 */
export function getProfileTrust(profile) {
  const verifiedAddress = !!profile.address_verified || !!profile.verified;

  const verifiedLinks =
    (typeof profile.verified_links === "number"
      ? profile.verified_links
      : typeof profile.verified_links_count === "number"
        ? profile.verified_links_count
        : null) ??
    (profile.links?.filter((l) => l.is_verified).length || 0);

  const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
  const isVerified = hasVerifiedContent;
  const canAuthenticateLinks = !!profile.address_verified;

  return { verifiedAddress, verifiedLinks, hasVerifiedContent, isVerified, canAuthenticateLinks };
}

/**
 * Computes warning configuration from profile trust state.
 *
 * Returns an object with { tone, summary, toggleLabel, defaultExpanded, details }
 * where `details` is an array of plain strings.
 *
 * Returns null if no warning should be shown.
 */
export function getWarningConfig({ profile, warning, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames }) {
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
export function getRankType(profile) {
  if (profile.rank_alltime > 0) return "alltime";
  if (profile.rank_weekly > 0) return "weekly";
  if (profile.rank_monthly > 0) return "monthly";
  if (profile.rank_daily > 0) return "daily";
  return null;
}

/**
 * Returns a Tailwind class string for the profile circle indicator.
 */
export function getCircleClass(isVerified, rankType) {
  if (isVerified && rankType) {
    return "bg-linear-to-r from-green-400 to-orange-500";
  }
  if (isVerified) {
    return "bg-green-500";
  }
  if (rankType) {
    const map = {
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
export function getProfileImageUrl(profile) {
  const rawUrl = profile.profile_image_url || "";
  const isTwitter = rawUrl.includes("pbs.twimg.com");

  if (isTwitter) return rawUrl;
  if (rawUrl.includes("?")) return rawUrl;
  return `${rawUrl}?v=${profile.last_signed_at || profile.created_at}`;
}

const normalizedName = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ /g, "_");

export function isNewProfile(profile) {
  const todayUTC = new Date().toISOString().slice(0, 10);
  return (profile.since || "").slice(0, 10) === todayUTC;
}

/**
 * Converts a verification timestamp to a human-readable "time ago" string.
 */
export function getVerifiedTimeAgo(timestamp) {
  if (!timestamp) return "N/A";
  const ts = new Date(timestamp).getTime();
  const weeks = (Date.now() - ts) / (1000 * 60 * 60 * 24 * 7);

  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
}
