// src/utils/domainParsing.js

export function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // handle malformed URLs like "x.com/y"
    const withoutProtocol = url.replace(/^https?:\/\//i, "");
    return withoutProtocol.split("/")[0].toLowerCase().replace(/^www\./, "");
  }
}

export function betweenTwoPeriods(domain) {
  if (!domain) return "";

  const parts = domain.split(".");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0];
  return parts[parts.length - 2];
}
