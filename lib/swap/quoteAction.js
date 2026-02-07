"use server";

import { oneclickQuote } from "@/lib/swap/oneClick";
import { buildQuotePayload, quoteObj, findToken } from "@/lib/swap/swapPayload";
import { getCachedTokens } from "./fetchTokens";

function formatTimeEstimate(seconds) {
  if (!seconds || typeof seconds !== "number") return "";
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `~${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `~${hours} hour${hours === 1 ? "" : "s"}`;
}

export async function getSwapQuote(body) {
  const tokensPayload = await getCachedTokens();
  if (tokensPayload.error) {
    return { ok: false, error: tokensPayload.error, retryable: true };
  }

  const payload = buildQuotePayload(body, { dry: true, tokensPayload });
  if (payload.error) {
    return { ok: false, error: payload.error, retryable: true };
  }

  const quote = await oneclickQuote(payload);
  if (quote.error) {
    return { ok: false, error: quote.error, retryable: true };
  }

  const q = quoteObj(quote);

  const quoteId =
    q?.id ||
    quote?.id ||
    quote?.quoteId ||
    quote?.data?.id ||
    null;

  const originTok = findToken(tokensPayload, payload.originAsset) || {};
  const destTok = findToken(tokensPayload, payload.destinationAsset) || {};
  const fromSymbol = originTok.symbol || originTok.ticker || payload.originAsset;
  const toSymbol = destTok.symbol || destTok.ticker || payload.destinationAsset;

  return {
    ok: true,
    quoteId,
    quote,
    display: {
      fromSymbol,
      toSymbol,
      amountInFormatted: q.amountInFormatted || body.amountIn,
      amountOutFormatted: q.amountOutFormatted,
      amountInUsd: q.amountInUsd ?? q.amountInUSD ?? q.amountInFiat,
      amountOutUsd: q.amountOutUsd ?? q.amountOutUSD ?? q.amountOutFiat,
      timeEstimate: formatTimeEstimate(q.timeEstimate),
      minAmountOut: q.minAmountOut ?? q.minimumAmountOut,
    },
    requestDebug: {
      originAsset: payload.originAsset,
      destinationAsset: payload.destinationAsset,
      amount: payload.amount,
      slippageTolerance: payload.slippageTolerance,
      deadline: payload.deadline,
    },
  };
}
