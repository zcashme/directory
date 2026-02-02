// Zcash address validation, URI construction, and memo encoding utilities.
// Merged from zcashAddressUtils.js, zcashWalletUtils.js, zcashMemoUtils.js.

import { bech32, bech32m } from "bech32";
import bs58check from "bs58check";

// ---------------------------------------------------------------------------
// Address helpers (module-private)
// ---------------------------------------------------------------------------

function isViewingKey(a = "") {
  return /^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(a.trim());
}

function isTex(a = "") {
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

function isTransparent(a = "") {
  const s = a.trim();
  if (!/^[tT](1|3|m|2)/.test(s)) return false;
  try {
    bs58check.decode(s);
    return true;
  } catch {
    return false;
  }
}

function isSapling(a = "") {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("zs1") || s.startsWith("ztestsapling1"))) return false;
  try {
    const dec = bech32.decode(s, 200);
    return dec.prefix === "zs" || dec.prefix === "ztestsapling";
  } catch {
    return false;
  }
}

function isUnified(a = "") {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("u1") || s.startsWith("utest1"))) return false;
  try {
    const dec = bech32m.decode(s, 300);
    return dec.prefix === "u" || dec.prefix === "utest";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Address validation & hints
// ---------------------------------------------------------------------------

export function validateZcashAddress(address = "") {
  const a = (address || "").trim();
  if (!a) return { valid: false, type: "none", reason: "empty" };
  if (isViewingKey(a)) return { valid: false, type: "viewing_key", reason: "viewing_key" };
  if (isTex(a)) return { valid: true, type: "tex", reason: "tex_disallowed" };
  if (isTransparent(a)) return { valid: true, type: "transparent", reason: "transparent_disallowed" };
  if (isSapling(a)) return { valid: true, type: "sapling" };
  if (isUnified(a)) return { valid: true, type: "unified" };
  return { valid: false, type: "unknown", reason: "format_mismatch" };
}

export function getZcashAddressHint(address = "") {
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

// ---------------------------------------------------------------------------
// Wallet URI utilities
// ---------------------------------------------------------------------------

export function buildZcashUri(address, amount = "0", memo = "") {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

export function toBase64Url(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function isValidZcashAddress(addr) {
  return typeof addr === "string" && /^u[0-9a-z]{60,}$/i.test(addr);
}

// ---------------------------------------------------------------------------
// Memo encoding
// ---------------------------------------------------------------------------

export function buildZcashEditMemo(profile = {}, zId = "?", requestId = null) {
  const fieldMap = {
    name: "n",
    display_name: "h",
    bio: "b",
    profile_image_url: "i",
    links: "l",
  };

  const clean = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => {
      if (Array.isArray(v)) return v.some((x) => x && x.trim() !== "");
      return v !== "" && v !== null && v !== undefined;
    })
  );

  const includeAddress = "address" in clean && clean.address.trim() !== "";

  const compactPairs = Object.entries(clean)
    .filter(([k]) => k !== "address")
    .map(([key, value]) => {
      const shortKey = fieldMap[key] || key;
      if (Array.isArray(value)) {
        return `${shortKey}:[${value
          .filter((x) => x && x.trim() !== "")
          .map((x) => `"${x}"`)
          .join(",")}]`;
      }
      return `${shortKey}:"${value}"`;
    });

  const requestIdPart = requestId ? `,rid:${requestId}` : "";

  return compactPairs.length > 0 || includeAddress || requestId
    ? `{z:${zId}${requestIdPart}${includeAddress ? `,a:"${clean.address.trim()}"` : ""}${compactPairs.length ? `,${compactPairs.join(",")}` : ""}}`
    : `{z:${zId}}`;
}
