// Business rules only - browser handles basic URL format validation via type="url"

type ValidationCode =
  | "EMPTY"
  | "BAD_FORMAT"
  | "NON_HTTPS"
  | "LOCAL_OR_IP"
  | "REDIRECTOR"
  | "TRACKING_PARAM_WARNING"
  | null;

interface URLValidationResult {
  valid: boolean;
  code: ValidationCode;
  reason: string | null;
}

const BLOCKED_REDIRECTORS = new Set([
  "t.co", "bit.ly", "tinyurl.com", "goo.gl", "linktr.ee", "lnks.gd",
  "rebrand.ly", "shorte.st", "trib.al", "buff.ly", "rb.gy", "ow.ly",
]);

const TRACKING_PARAMS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^ref_src$/i, /^mc_cid$/i, /^mc_eid$/i, /^t$/i, /^s$/i, /^si$/i];

export function isValidUrl(url: string | null | undefined): URLValidationResult {
  if (!url?.trim()) {
    return { valid: false, code: "EMPTY", reason: "Enter a URL." };
  }

  // Browser's URL constructor validates format - if it fails, format is bad
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { valid: false, code: "BAD_FORMAT", reason: "URL is not correctly formatted." };
  }

  // Business rules only (browser doesn't enforce these)
  if (u.protocol !== "https:") {
    return { valid: false, code: "NON_HTTPS", reason: "Only HTTPS links are allowed." };
  }

  const hostname = u.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".local") || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return { valid: false, code: "LOCAL_OR_IP", reason: "Local network or IP-address URLs are not allowed." };
  }

  if (BLOCKED_REDIRECTORS.has(hostname)) {
    return { valid: false, code: "REDIRECTOR", reason: "Link shorteners or redirect URLs (like bit.ly) are not allowed." };
  }

  // Warn about tracking params (but still valid)
  for (const [key] of u.searchParams.entries()) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) {
      return { valid: true, code: "TRACKING_PARAM_WARNING", reason: "Please remove tracking parameters (e.g. ?t=…)." };
    }
  }

  return { valid: true, code: null, reason: null };
}
