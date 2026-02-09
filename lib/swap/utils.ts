import type { Token } from "./types";

/**
 * Helper: Standardized token ID extraction
 */
export function getTokenId(token: Token | null | undefined): string | null {
  if (!token) return null;
  return token.id || token.assetId || null;
}

/**
 * Helper: Find token by ID from token list
 */
export function findToken(tokens: Token[], tokenId: string): Token | null {
  return tokens.find((t) => getTokenId(t) === tokenId) || null;
}

/**
 * Helper: Convert decimal amount to base units (wei, satoshis, etc.)
 */
export function toBaseUnits(amountStr: string | number, decimals: number): string | null {
  const cleaned = String(amountStr || "").trim();
  if (!cleaned || cleaned === "0" || cleaned === "0.0") return null;

  const dec = Number(decimals);
  if (!Number.isFinite(dec) || dec < 0 || dec > 30) return null;

  const parts = cleaned.split(".");
  if (parts.length > 2) return null;

  const [whole = "0", fraction = ""] = parts;

  if (!/^\d+$/.test(whole)) return null;
  if (whole === "0" && fraction === "") return null;

  const paddedFraction = fraction.padEnd(dec, "0").slice(0, dec);
  if (fraction && !/^\d+$/.test(fraction)) return null;

  try {
    const baseUnits = BigInt(whole + paddedFraction);
    if (baseUnits <= 0n) return null;
    return baseUnits.toString();
  } catch {
    return null;
  }
}

/**
 * Helper: Convert base units to decimal amount
 */
export function baseUnitsToDecimal(amountBase: string | number | bigint, decimals: number): string {
  const dec = Number(decimals);
  if (!Number.isFinite(dec) || dec < 0 || dec > 30) return "0";

  try {
    const base = BigInt(amountBase);
    if (base < 0n) return "0";
    if (base === 0n) return "0";

    const str = base.toString().padStart(dec + 1, "0");
    const whole = str.slice(0, -dec) || "0";
    const fraction = str.slice(-dec).replace(/0+$/, "");

    return fraction ? `${whole}.${fraction}` : whole;
  } catch {
    return "0";
  }
}

/**
 * Parse token symbol from asset ID
 * Example: "eth.mainnet.0x..." -> "ETH"
 * Example: "nep141:eth.omft" -> "ETH"
 */
export function parseTokenSymbol(assetId?: string): string {
  if (!assetId) return "";

  const parts = assetId.split(".");
  if (parts.length === 0) return "";

  // Handle chain prefix like "nep141:eth"
  let symbol = parts[0];
  if (symbol.includes(":")) {
    symbol = symbol.split(":")[1] || symbol;
  }

  return symbol.toUpperCase();
}
