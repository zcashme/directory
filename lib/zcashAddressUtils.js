// src/utils/zcashAddressUtils.js
// Zcash address validation including Transparent, Sapling, Unified, and TEX addresses.
// TEX addresses (tex1...) are valid Bech32m encodings of transparent P2PKH,
// but we disallow them here (treated as valid-but-unsupported).

import { bech32, bech32m } from "bech32";
import bs58check from "bs58check";

// --- basic helpers ----------------------------------------------------------

function isViewingKey(a = "") {
  return /^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(a.trim());
}

// --- TEX detection (Bech32m “Transparent Source Only”) ---------------------
function isTex(a = "") {
  const s = a.trim().toLowerCase();
  if (!(s.startsWith("tex1") || s.startsWith("textest1"))) return false;
  try {
    const dec = bech32m.decode(s, 100);
    // ZIP 320 defines HRP "tex" / "textest", 20-byte payload, but we tolerate padding variations.
    if (dec.prefix === "tex" || dec.prefix === "textest") {
      const data = bech32m.fromWords(dec.words);
      return data.length === 20;
    }
    return false;
  } catch {
    return false;
  }
}


// --- Transparent (Base58Check t1 / tm) -------------------------------------
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

// --- Sapling (Bech32 zs1 / ztestsapling1) ----------------------------------
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

// --- Unified (Bech32m u1 / utest1) ----------------------------------------
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
