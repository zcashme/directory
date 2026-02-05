"use server";

import { oneclickTokens, oneclickQuote } from "@/lib/oneClick";
import { buildQuotePayload, quoteObj, findToken } from "@/lib/swapPayload";

export async function getSwapQuote(body) {
  try {
    const tokensPayload = await oneclickTokens();
    const payload = buildQuotePayload(body, { dry: true, tokensPayload });

    const quote = await oneclickQuote(payload);
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
      quote, // raw quote
      display: {
        fromSymbol,
        toSymbol,
        amountInFormatted: q.amountInFormatted || body.amountIn,
        amountOutFormatted: q.amountOutFormatted,
        amountInUsd: q.amountInUsd ?? q.amountInUSD ?? q.amountInFiat,
        amountOutUsd: q.amountOutUsd ?? q.amountOutUSD ?? q.amountOutFiat,
        timeEstimate: q.timeEstimate,
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
  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e),
      retryable: true,
    };
  }
}
