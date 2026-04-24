const BLOCKED_REDIRECTORS = new Set([
  't.co',
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'linktr.ee',
  'lnks.gd',
  'rebrand.ly',
  'shorte.st',
  'trib.al',
  'buff.ly',
  'rb.gy',
  'ow.ly',
]);

const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^ref$/i,
  /^ref_src$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^t$/i,
  /^s$/i,
  /^si$/i,
];

export function normalizeUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return `https://${value}`;
  return value;
}

export function isValidUrl(raw: string): { valid: boolean; reason: string | null } {
  const trimmed = raw?.trim();
  if (!trimmed) return { valid: false, reason: 'Enter a URL.' };

  const normalized = normalizeUrl(trimmed);

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return { valid: false, reason: 'URL is not correctly formatted.' };
  }

  if (url.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS links are allowed.' };
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
  ) {
    return { valid: false, reason: 'Local network or IP-address URLs are not allowed.' };
  }

  // Single-label hostnames ("ZcashNames") and trailing-dot hostnames ("ZcashNames.")
  // parse as valid URLs but can't resolve on the public internet — require a
  // TLD-like suffix (at least 2 letters after the last dot).
  if (!/\.[a-z]{2,}$/i.test(hostname)) {
    return { valid: false, reason: 'URL is not correctly formatted.' };
  }

  if (BLOCKED_REDIRECTORS.has(hostname)) {
    return { valid: false, reason: 'Link shorteners or redirect URLs (like bit.ly) are not allowed.' };
  }

  const params = Array.from(url.searchParams.keys());
  for (const key of params) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) {
      return { valid: true, reason: 'Please remove tracking parameters (e.g. ?t=…).' };
    }
  }

  return { valid: true, reason: null };
}
