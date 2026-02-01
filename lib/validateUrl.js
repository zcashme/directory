// src/utils/validateUrl.js

// Blocked redirect and shortener domains
const BLOCKED_REDIRECTORS = new Set([
  "t.co",
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "linktr.ee",
  "lnks.gd",
  "rebrand.ly",
  "shorte.st",
  "trib.al",
  "buff.ly",
  "rb.gy",
  "ow.ly",
]);

// Tracking params (utm source, fbclid, ref, etc.)
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^ref$/i,
  /^ref_src$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^t$/i,        // NEW: ?t=...
  /^s$/i,        // NEW: ?s=...
  /^si$/i        // NEW: ?si=...
];

// Must have ≥2-letter alphabetic TLD
const TLD_REGEX = /^[a-zA-Z]{2,}$/;

// IPv4 detection
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

// Simplified IPv6 detection
const IPV6_REGEX = /^\[?[0-9a-fA-F:]+\]?$/;

function isBlockedHost(hostname) {
  if (!hostname) return true;

  const hn = hostname.toLowerCase();

  // local
  if (hn === "localhost") return true;
  if (hn.endsWith(".local")) return true;

  // IP addresses
  if (IPV4_REGEX.test(hn)) return true;
  if (IPV6_REGEX.test(hn)) return true;

  return false;
}

export function isValidUrl(url) {
  if (!url || typeof url !== "string") {
    return {
      valid: false,
      code: "EMPTY",
      reason: "Enter a URL."
    };
  }

  let u;
  try {
    u = new URL(url);
  } catch {
    return {
      valid: false,
      code: "BAD_FORMAT",
      reason: "URL is not correctly formatted."
    };
  }

  // 1. HTTPS only
  if (u.protocol !== "https:") {
    return {
      valid: false,
      code: "NON_HTTPS",
      reason: "Only HTTPS links are allowed."
    };
  }

  const hostname = u.hostname.toLowerCase();

  // 2. Block local hosts and IP addresses
  if (isBlockedHost(hostname)) {
    return {
      valid: false,
      code: "LOCAL_OR_IP",
      reason: "Local network or IP-address URLs are not allowed."
    };
  }

  // 3. Block redirectors
  if (BLOCKED_REDIRECTORS.has(hostname)) {
    return {
      valid: false,
      code: "REDIRECTOR",
      reason: "Link shorteners or redirect URLs (like bit.ly) are not allowed."
    };
  }

  // 4. Validate TLD
  const tld = hostname.split(".").pop();
  if (!TLD_REGEX.test(tld)) {
    return {
      valid: false,
      code: "BAD_TLD",
      reason: "URL must end with a valid domain extension."
    };
  }

  // 5. Tracking parameters → now a WARNING, not an error
  for (const [key] of u.searchParams.entries()) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) {
      return {
        valid: true,                       // still valid
        code: "TRACKING_PARAM_WARNING",
        reason: "Please remove tracking parameters (e.g. ?t=…)."
      };
    }
  }

  // 6. Passed all checks
  return {
    valid: true,
    code: null,
    reason: null
  };
}
