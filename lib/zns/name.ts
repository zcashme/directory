const NAME_RE = /^[a-z0-9]{1,62}$/;

export const ZNS_NAME_MAX_LENGTH = 62;

export function normalizeZnsName(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isValidZnsName(name: string): boolean {
  return NAME_RE.test(name);
}

export function sanitizeZnsUsernameInput(raw: string): string {
  return normalizeZnsName(raw).slice(0, ZNS_NAME_MAX_LENGTH);
}

export function addressesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = (left ?? "").trim().toLowerCase();
  const b = (right ?? "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function buildWaitlistReserveMemo(name: string, waitlistId: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error(`Waitlist row ${waitlistId} is missing a usable name.`);
  }
  return `ZNS:RESERVE|Name::${normalizedName}|UUID::${waitlistId}`;
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
