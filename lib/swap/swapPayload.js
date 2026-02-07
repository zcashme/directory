function extractTokensList(tokensPayload) {
  return Array.isArray(tokensPayload) ? tokensPayload : [];
}

/**
 * Standardized token ID extraction.
 */
export function getTokenId(token) {
  if (!token) return null;
  return token.id || token.assetId || token.tokenId || token.asset || null;
}

export function findToken(tokensPayload, tokenId) {
  const tokens = extractTokensList(tokensPayload);
  return tokens.find((t) => getTokenId(t) === tokenId) || null;
}

function deadlineIso(minutes = 20) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * Convert percentage to basis points (bps)
 * Formula: percentage * 100 = basis points  -> API expects: basis points
 */
function intBps(value, def = 50) {
  const v = parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(v) || v < 0) return def;
  // Convert percentage to basis points by multiplying by 100
  const bps = Math.round(v * 100);
  return Math.max(0, Math.min(10_000, bps));
}

export function toBaseUnits(amountStr, decimals) {
  const cleaned = String(amountStr || "").trim();
  if (!cleaned || cleaned === "0" || cleaned === "0.0") return null;

  // Validate decimals
  const dec = Number(decimals);
  if (!Number.isFinite(dec) || dec < 0 || dec > 30) return null;

  // Split into whole and fractional parts
  const parts = cleaned.split(".");
  if (parts.length > 2) return null; // Invalid: multiple decimal points

  const [whole = "0", fraction = ""] = parts;

  // Validate whole part
  if (!/^\d+$/.test(whole)) return null;
  if (whole === "0" && fraction === "") return null;

  // Pad or truncate fraction to exact decimals
  const paddedFraction = fraction.padEnd(dec, "0").slice(0, dec);

  // Validate fraction part (if exists)
  if (fraction && !/^\d+$/.test(fraction)) return null;

  try {
    // Concatenate and convert to BigInt, then back to string
    const baseUnits = BigInt(whole + paddedFraction);
    if (baseUnits <= 0n) return null;
    return baseUnits.toString();
  } catch {
    return null;
  }
}

export function baseUnitsToDecimal(amountBase, decimals) {
  // Validate decimals
  const dec = Number(decimals);
  if (!Number.isFinite(dec) || dec < 0 || dec > 30) return "0";

  try {
    // Convert to BigInt to validate it's a valid integer
    const base = BigInt(amountBase);
    if (base < 0n) return "0";
    if (base === 0n) return "0";

    // Convert back to string and pad with leading zeros if needed
    const str = base.toString().padStart(dec + 1, "0");

    // Split into whole and fractional parts
    const whole = str.slice(0, -dec) || "0";
    const fraction = str.slice(-dec).replace(/0+$/, ""); // Remove trailing zeros

    return fraction ? `${whole}.${fraction}` : whole;
  } catch {
    return "0";
  }
}

export function buildQuotePayload(body, { dry, tokensPayload }) {
  const required = ["fromToken", "toToken", "amountIn", "destAddress"];
  for (const k of required) {
    if (!body?.[k]) return { error: `Missing ${k}` };
  }

  if (!body?.refundAddress) return { error: "Refund address required" };

  const origin = findToken(tokensPayload, body.fromToken);
  const dest = findToken(tokensPayload, body.toToken);
  if (!origin) return { error: "From token not found. Refresh and try again." };
  if (!dest) return { error: "To token not found. Refresh and try again." };

  const decimals = Number(origin.decimals || 0);
  const amountBase = toBaseUnits(body.amountIn, decimals);
  if (!amountBase) return { error: "Amount must be greater than 0" };

  return {
    dry,
    swapType: "EXACT_INPUT",
    slippageTolerance: intBps(body.slippageTolerance, 50),
    originAsset: body.fromToken,
    destinationAsset: body.toToken,
    amount: amountBase,
    depositType: "ORIGIN_CHAIN",
    refundTo: body.refundAddress,
    refundType: "ORIGIN_CHAIN",
    recipient: body.destAddress,
    recipientType: "DESTINATION_CHAIN",
    deadline: deadlineIso(20),
    quoteWaitingTimeMs: 3000,
  };
}

export function quoteObj(resp) {
  return (resp?.quote && typeof resp.quote === "object") ? resp.quote : {};
}

export function extractDepositFields(resp) {
  const q = quoteObj(resp);
  return {
    depositAddress: q?.depositAddress || null,
    depositMemo: q?.depositMemo || null,
    depositMode: q?.depositMode || null,
  };
}
