function extractTokensList(tokensPayload) {
  return Array.isArray(tokensPayload) ? tokensPayload : [];
}

export function findToken(tokensPayload, tokenId) {
  const tokens = extractTokensList(tokensPayload);
  return tokens.find((t) => t.id === tokenId) || null;
}

function deadlineIso(minutes = 20) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function intBps(value, def = 50) {
  const v = parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(10_000, v));
}

export function toBaseUnits(amountStr, decimals) {
  const amt = Number(String(amountStr).trim());
  if (!Number.isFinite(amt) || amt <= 0) return null;

  // Avoid floating issues: do a decimal-string approach for up to 8dp typical.
  // For production, use a bignum decimal library; this matches your current needs.
  const scale = 10 ** Number(decimals);
  const base = Math.floor(amt * scale + 1e-9);
  return String(base);
}

export function baseUnitsToDecimal(amountBase, decimals) {
  const n = Number(amountBase);
  const d = Number(decimals);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d < 0) return "0";
  const v = n / 10 ** d;
  // 8dp display like your Flask
  return String(v.toFixed(8)).replace(/\.?0+$/, "");
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
