const NAME_RE = /^[a-z0-9]{1,63}$/;
const DISPLAY_SUFFIX_RE = /\.(zcash|zec)$/;

export const ZNS_NAME_MAX_LENGTH = 63;

export const ZCASH_NAMES_ORIGIN = "https://zcashnames.com";

export const PROTECTED_NAME_SIGNUP_ERROR =
  "This name is protected and cannot be used as a Zcash.me username.";

/**
 * Trim, lowercase, and strip one trailing .zcash / .zec suffix.
 * Does not strip other characters — `alice_bob` is not `alicebob`.
 */
export function normalizeZnsName(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(DISPLAY_SUFFIX_RE, "");
}

export function isValidZnsName(name: string): boolean {
  return NAME_RE.test(name);
}

export function sanitizeZnsUsernameInput(raw: string): string {
  return normalizeZnsName(raw).replace(/[^a-z0-9]/g, "").slice(0, ZNS_NAME_MAX_LENGTH);
}

export function znsNamesMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = normalizeZnsName(left ?? "");
  const b = normalizeZnsName(right ?? "");
  return Boolean(a && b && isValidZnsName(a) && isValidZnsName(b) && a === b);
}

export function addressesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = (left ?? "").trim().toLowerCase();
  const b = (right ?? "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function formatZnsZecLabel(name: string): string {
  const normalized = normalizeZnsName(name);
  return normalized ? `${normalized}.zec` : "";
}

export function znsExplorerHref(name: string): string {
  const normalized = normalizeZnsName(name);
  return `${ZCASH_NAMES_ORIGIN}/explorer?name=${encodeURIComponent(normalized)}`;
}

export function znsUpdateHref(name: string): string {
  const normalized = normalizeZnsName(name);
  return `${ZCASH_NAMES_ORIGIN}/update/${encodeURIComponent(normalized)}`;
}

export function znsClaimHref(name: string, address?: string | null): string {
  const normalized = normalizeZnsName(name);
  const href = `${ZCASH_NAMES_ORIGIN}/claim/${encodeURIComponent(normalized)}`;
  const trimmedAddress = (address ?? "").trim();
  if (!trimmedAddress) return href;
  return `${href}?address=${encodeURIComponent(trimmedAddress)}`;
}

export function zip321Uri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const params: string[] = [];
  const numericAmount = Number(amount);
  if (amount && Number.isFinite(numericAmount) && numericAmount > 0) {
    params.push(`amount=${amount}`);
  }
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `zcash:${address}?${params.join("&")}` : `zcash:${address}`;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
