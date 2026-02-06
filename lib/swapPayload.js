function extractTokensList(tokensPayload) {
  if (Array.isArray(tokensPayload)) return tokensPayload;
  if (tokensPayload && typeof tokensPayload === "object") {
    if (Array.isArray(tokensPayload.tokens)) return tokensPayload.tokens;
    if (Array.isArray(tokensPayload.data)) return tokensPayload.data;
  }
  return [];
}

export function findToken(tokensPayload, tokenId) {
  const tokens = extractTokensList(tokensPayload);
  return tokens.find((t) => (t.id || t.tokenId || t.assetId || t.asset) === tokenId) || null;
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
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be > 0");

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
  for (const k of required) if (!body?.[k]) throw new Error(`Missing field: ${k}`);

  // refundAddress is required in your Flask build.
  // If you don’t want UI changes, you can supply a server-side default per chain.
  // Keep it required here unless you set defaults in the route.
  if (!body?.refundAddress) throw new Error("Missing field: refundAddress");

  const origin = findToken(tokensPayload, body.fromToken);
  const dest = findToken(tokensPayload, body.toToken);
  if (!origin) throw new Error("Unknown fromToken. Refresh tokens and try again.");
  if (!dest) throw new Error("Unknown toToken. Refresh tokens and try again.");

  const decimals = Number(origin.decimals || 0);
  const amountBase = toBaseUnits(body.amountIn, decimals);

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
  let q = resp?.quote || resp?.data || {};
  if (q && typeof q === "object" && q.quote && typeof q.quote === "object") q = q.quote;
  return (q && typeof q === "object") ? q : {};
}

export function extractDepositFields(resp) {
  const q = quoteObj(resp);
  return {
    depositAddress: resp?.depositAddress || q?.depositAddress || null,
    depositMemo: resp?.depositMemo || q?.depositMemo || null,
    depositMode: resp?.depositMode || q?.depositMode || null,
  };
}
