// Zcash address validation, URI construction, and memo encoding utilities.

import { bech32, bech32m } from "bech32";
import bs58check from "bs58check";

// Address helpers (module-private)

function isViewingKey(a: string = ""): boolean {
  return /^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(a.trim());
}

function isTex(a: string = ""): boolean {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("tex1") || s.startsWith("textest1"))) return false;
  try {
    const dec = bech32m.decode(s, 100);
    if (dec.prefix === "tex" || dec.prefix === "textest") {
      const data = bech32m.fromWords(dec.words);
      return data.length === 20;
    }
    return false;
  } catch {
    return false;
  }
}

function isTransparent(a: string = ""): boolean {
  const s = a.trim();
  if (!/^[tT](1|3|m|2)/.test(s)) return false;
  try {
    bs58check.decode(s);
    return true;
  } catch {
    return false;
  }
}

function isSapling(a: string = ""): boolean {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("zs1") || s.startsWith("ztestsapling1"))) return false;
  try {
    const dec = bech32.decode(s, 200);
    return dec.prefix === "zs" || dec.prefix === "ztestsapling";
  } catch {
    return false;
  }
}

function isUnified(a: string = ""): boolean {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("u1") || s.startsWith("utest1"))) return false;
  try {
    const dec = bech32m.decode(s, 300);
    return dec.prefix === "u" || dec.prefix === "utest";
  } catch {
    return false;
  }
}

// Address validation & hints

type ZcashAddressType = "none" | "viewing_key" | "tex" | "transparent" | "sapling" | "unified" | "unknown";
type ValidationReason = "empty" | "viewing_key" | "tex_disallowed" | "transparent_disallowed" | "format_mismatch" | null;

interface ZcashValidationResult {
  valid: boolean;
  type: ZcashAddressType;
  reason?: ValidationReason;
}

export function validateZcashAddress(address: string = ""): ZcashValidationResult {
  const a = (address ?? "").trim();
  if (!a) return { valid: false, type: "none", reason: "empty" };
  if (isViewingKey(a)) return { valid: false, type: "viewing_key", reason: "viewing_key" };
  if (isTex(a)) return { valid: true, type: "tex", reason: "tex_disallowed" };
  if (isTransparent(a)) return { valid: true, type: "transparent", reason: "transparent_disallowed" };
  if (isSapling(a)) return { valid: true, type: "sapling" };
  if (isUnified(a)) return { valid: true, type: "unified" };
  return { valid: false, type: "unknown", reason: "format_mismatch" };
}

export function getZcashAddressHint(address: string = ""): string {
  const res = validateZcashAddress(address);
  if (!address) return "Enter your Zcash address (t1…, zs1…, or u1…).";

  if (res.type === "viewing_key") {
    return "That looks like a viewing key, not a payment address.";
  }

  if (res.type === "tex") {
    return "TEX addresses (tex1…) are defined in ZIP 320 and can only receive funds from transparent addresses, not from shielded ones. Try using a z- or u-address instead.";
  }

  if (res.type === "transparent") {
    return "Transparent t-addresses leak sender, receiver, and amount publicly. Use a z- or u-address instead.";
  }

  if (res.type === "sapling") return "Looks good — valid Sapling address ✓";
  if (res.type === "unified") return "Looks good — valid Unified address ✓";

  return "Invalid address. Must be transparent (t1…), Sapling (zs1…), or Unified (u1…).";
}

// Wallet URI utilities

export function buildZcashUri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}
