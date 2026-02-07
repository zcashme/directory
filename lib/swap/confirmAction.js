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

// Payment URI builder: creates proper URIs for BTC, ETH, SOL; falls back to address-only for others.
function buildPaymentUri(originSymbolOrChain, address, amountDecimal) {
  const sym = String(originSymbolOrChain || "").toUpperCase();

  if (sym === "BTC") {
    const qs = amountDecimal ? `?amount=${encodeURIComponent(amountDecimal)}` : "";
    return `bitcoin:${address}${qs}`;
  }

  if (sym === "ETH") {
    // EIP-681: uses 'value' parameter (in ETH units)
    const qs = amountDecimal ? `?value=${encodeURIComponent(amountDecimal)}` : "";
    return `ethereum:${address}${qs}`;
  }

  if (sym === "SOL") {
    const qs = amountDecimal ? `?amount=${encodeURIComponent(amountDecimal)}` : "";
    return `solana:${address}${qs}`;
  }

  // For tokens like USDC/USDT or other chains, return address-only
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

    const { depositAddress, depositMode } = extractDepositFields(resp);
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
        mode: depositMode,
        amountBaseUnits: String(depositAmountBase),
        amountDecimal,
        originAsset: payload.originAsset,
        decimals,
      },
      paymentUri,
      statusKey: {
        depositAddress,
      },
      display: {
        amountInFormatted: q.amountInFormatted || body.amountIn,
        amountOutFormatted: q.amountOutFormatted,
        timeEstimateSec: q.timeEstimate || q.timeEstimateSec || q.estimatedTimeSeconds,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Internal server error",
      retryable: true,
    };
  }
}
