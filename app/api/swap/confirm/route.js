import crypto from "crypto";
import { oneclickTokens, oneclickQuote } from "../../../../lib/oneClick";

import {
  buildQuotePayload,
  quoteObj,
  extractDepositFields,
  findToken,
  baseUnitsToDecimal,
} from "../../../../lib/swapPayload";

// Minimal payment URI builder: BTC gets bitcoin: URI; otherwise QR encodes address only.
function buildPaymentUri(originSymbolOrChain, address, amountDecimal) {
  const sym = String(originSymbolOrChain || "").toUpperCase();
  if (sym === "BTC") {
    const qs = amountDecimal ? `?amount=${encodeURIComponent(amountDecimal)}` : "";
    return `bitcoin:${address}${qs}`;
  }
  // Many chains have different URI schemes; safest default is address-only.
  return address;
}

export async function POST(req) {
  const swapId = crypto.randomUUID();

  try {
    const body = await req.json();
    const tokensPayload = await oneclickTokens();
    const payload = buildQuotePayload(body, { dry: false, tokensPayload });

    const resp = await oneclickQuote(payload);

    const { depositAddress, depositMemo, depositMode } = extractDepositFields(resp);
    if (!depositAddress) throw new Error("Confirm succeeded but deposit address missing in quote response.");

    const q = quoteObj(resp);

    const depositAmountBase =
      q.amountToDeposit ||
      q.requiredDepositAmount ||
      q.depositAmount ||
      q.amountIn ||
      payload.amount;

    const originToken = findToken(tokensPayload, payload.originAsset) || {};
    const decimals = Number(originToken.decimals ?? 8);
    const amountDecimal = baseUnitsToDecimal(String(depositAmountBase), decimals);

    const originSymbol = originToken.symbol || originToken.ticker || payload.originAsset;
    const paymentUri = buildPaymentUri(originSymbol, depositAddress, amountDecimal);

    // Safety check for BTC direction bugs
    if (String(originSymbol).toUpperCase() === "BTC") {
      const a = String(depositAddress);
      const looksBtc = a.startsWith("bc1") || a.startsWith("1") || a.startsWith("3");
      if (!looksBtc) throw new Error(`BUG: BTC origin but depositAddress is not BTC-like: ${depositAddress}`);
    }

    return Response.json({
      ok: true,
      swapId,
      deposit: {
        address: depositAddress,
        memo: depositMemo,
        mode: depositMode,
        amountBaseUnits: String(depositAmountBase),
        amountDecimal,
        originAsset: payload.originAsset,
        decimals,
      },

      paymentUri,

      statusKey: {
        depositAddress,
        depositMemo,
      },

      display: {
        amountInFormatted: q.amountInFormatted || body.amountIn,
        amountOutFormatted: q.amountOutFormatted,
        timeEstimateSec: q.timeEstimate || q.timeEstimateSec || q.estimatedTimeSeconds,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e), retryable: true }, { status: 200 });
  }
}
