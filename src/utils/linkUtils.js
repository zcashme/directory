import { extractDomain } from "./domainParsing";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "./domainLabels";

export const getLinkIcon = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.icon || FALLBACK_ICON;
};

export const getLinkLabel = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.label || domain || "Link";
};

export const getSocialHandle = (url = "") => {
  const cleaned = url.split("#")[0].split("?")[0].replace(/\/+$/, "");
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1] || "";
  return decodeURIComponent(last);
};

export const isDiscordLink = (url = "") =>
  /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com|discord\.gg)\//i.test(
    url || ""
  );

export const getSocialDisplay = (link) => {
  if (!link) return "";
  if (isDiscordLink(link.url) && link.is_verified && link.label) {
    return link.label;
  }
  return getSocialHandle(link.url || "");
};
