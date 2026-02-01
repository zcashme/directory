import { extractDomain, betweenTwoPeriods } from "@/lib/domainParsing";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "@/lib/domainLabels";
import { getSocialHandle } from "@/lib/linkUtils";

/**
 * Enriches a raw link object with a resolved label and favicon icon.
 */
export function enrichLink(link) {
  const domain = extractDomain(link.url);
  const dbLabel = (link.label || "").trim();
  const handle = getSocialHandle(link.url || "");
  const normalizedDomain = (domain || "").toLowerCase();
  const normalizedHandle = (handle || "").toLowerCase();
  const normalizedLabel = dbLabel.toLowerCase();
  const isHandleDomain =
    normalizedHandle === normalizedDomain ||
    normalizedHandle === `www.${normalizedDomain}`;
  const domainLabel = (KNOWN_DOMAINS[domain]?.label || "").toLowerCase();
  const shouldUseHandle =
    !!handle &&
    !isHandleDomain &&
    (!dbLabel ||
      normalizedLabel === normalizedDomain ||
      normalizedLabel === `www.${normalizedDomain}` ||
      normalizedLabel === domainLabel ||
      normalizedLabel.startsWith(`${normalizedDomain}/`) ||
      normalizedLabel.startsWith(`www.${normalizedDomain}/`));

  if (KNOWN_DOMAINS[domain]) {
    return {
      ...link,
      label: (shouldUseHandle ? handle : dbLabel) || KNOWN_DOMAINS[domain].label,
      icon: KNOWN_DOMAINS[domain].icon,
    };
  }

  return {
    ...link,
    label:
      (shouldUseHandle ? handle : dbLabel) ||
      betweenTwoPeriods(domain) ||
      "Unknown",
    icon: FALLBACK_ICON,
  };
}
