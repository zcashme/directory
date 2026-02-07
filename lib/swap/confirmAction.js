"use server";

import { oneclickQuote } from "@/lib/swap/oneClick";
import {
  buildQuotePayload,
  quoteObj,
  extractDepositFields,
  findToken,
  baseUnitsToDecimal,
} from "@/lib/swap/swapPayload";
import { getCachedTokens } from "./fetchTokens";

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

export async function confirmSwapAction(body) {
  try {
    const tokensPayload = await getCachedTokens();
    if (tokensPayload.error) {
      return { ok: false, error: tokensPayload.error, retryable: true };
    }

    const payload = buildQuotePayload(body, { dry: false, tokensPayload });
    if (payload.error) {
      return { ok: false, error: payload.error, retryable: true };
    }

    const resp = await oneclickQuote(payload);
    if (resp.error) {
      return { ok: false, error: resp.error, retryable: true };
    }

    const { depositAddress, depositMemo, depositMode } = extractDepositFields(resp);
    if (!depositAddress) {
      return { ok: false, error: "Unable to process swap. Please try again.", retryable: true };
    }

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

    return {
      ok: true,
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
    };
  } catch (error) {
    console.error("confirmSwapAction error:", error);
    return {
      ok: false,
      error: error.message || "Internal server error",
      retryable: true,
    };
  }
}
