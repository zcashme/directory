/**
 * Computes warning configuration from profile trust state.
 *
 * Returns an object with { tone, summary, toggleLabel, defaultExpanded, details }
 * where `details` is an array of items. Each item is either a plain string or
 * an object `{ type: "duplicateNameLink", nameSearchUrl }` representing a rich
 * element that the component should render as JSX.
 *
 * Returns null if no warning should be shown.
 */
export function getWarningConfig({ profile, warning, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames }) {
  if (!warning) return null;

  const name = profile?.display_name || profile?.name || "This profile";
  const nameSearchUrl = profile?.name
    ? `/?search=${encodeURIComponent(profile.name)}`
    : "/";
  const hasLinks = totalLinks > 0;
  const hasAuthenticatedLinks = verifiedLinks > 0;

  if (!verifiedAddress) {
    if (!hasLinks && hasDuplicateNames) {
      return {
        tone: "red",
        summary: `⚠ ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        defaultExpanded: false,
        details: [
          { type: "duplicateNameLink", nameSearchUrl },
          "No links are available to verify that this address belongs to the same person.",
        ],
      };
    }

    if (!hasLinks) {
      return {
        tone: "red",
        summary: `⚠ ${name} may not be who you think.`,
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
        summary: `⚠ ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        details: [
          { type: "duplicateNameLink", nameSearchUrl },
          "Links are provided but their ownership has not been authenticated.",
        ],
      };
    }

    return {
      tone: "yellow",
      summary: `⚠ ${name} may not be who you think.`,
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
      summary: "⚠ This address was recently active.",
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
