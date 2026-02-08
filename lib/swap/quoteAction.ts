"use server";

import { oneclickQuote } from "@/lib/swap/oneClick";
import { buildQuotePayload, quoteObj, findToken } from "@/lib/swap/swapPayload";
import { getCachedTokens } from "./fetchTokens";
import { validateAddressForBlockchain } from "./addressValidation";
import type { SwapQuoteRequest, SwapQuoteResponse } from "@/lib/swap/types";

function formatTimeEstimate(seconds: number | undefined): string {
  if (!seconds || typeof seconds !== "number") return "";
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `~${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `~${hours} hour${hours === 1 ? "" : "s"}`;
}

function getUserFriendlyErrorMessage(apiErrorMessage: string | undefined): string {
  const errorMap: Record<string, string> = {
    "refundTo is not valid": "Your refund address is incorrect. Please verify and try again.",
    "refundTo should not be empty": "Refund address is required.",
    "recipient is not valid": "The destination address is invalid. Please check the address format.",
    "tokenIn is not valid": "Invalid origin token. Please select a valid token.",
    "tokenOut is not valid": "Invalid destination token. Please refresh and try again.",
    "amount must be greater than 0": "Amount must be greater than zero.",
  };

  for (const [apiError, userMessage] of Object.entries(errorMap)) {
    if (apiErrorMessage?.includes(apiError)) {
      return userMessage;
    }
  }

  return apiErrorMessage || "An error occurred. Please try again.";
}

export async function getSwapQuote(body: SwapQuoteRequest): Promise<SwapQuoteResponse> {
  const tokensPayload = await getCachedTokens();
  if ("error" in tokensPayload && tokensPayload.error) {
    const friendlyError = getUserFriendlyErrorMessage(tokensPayload.error);
    return { ok: false, error: friendlyError, retryable: true };
  }

  const payload = buildQuotePayload(body, { dry: true, tokensPayload });
  if ("error" in payload) {
    const friendlyError = getUserFriendlyErrorMessage(payload.error);
    return { ok: false, error: friendlyError, retryable: true };
  }

  // Validate refund address format matches the origin token's blockchain
  const originToken = findToken(tokensPayload, payload.originAsset);
  if (originToken && payload.refundTo) {
    const validation = validateAddressForBlockchain(payload.refundTo, originToken.blockchain);
    if (!validation.valid) {
      return { ok: false, error: validation.error, retryable: false };
    }
  }

  const quote = await oneclickQuote(payload);
  if ("error" in quote) {
    const friendlyError = getUserFriendlyErrorMessage(quote.error);
    return { ok: false, error: friendlyError, retryable: true };
  }

  const q = quoteObj(quote);

  const quoteId =
    q?.id ||
    quote?.id ||
    quote?.quoteId ||
    (quote as any)?.data?.id ||
    null;

  const originTok = findToken(tokensPayload, payload.originAsset);
  const destTok = findToken(tokensPayload, payload.destinationAsset);
  const fromSymbol = originTok?.symbol || originTok?.ticker || payload.originAsset;
  const toSymbol = destTok?.symbol || destTok?.ticker || payload.destinationAsset;

  return {
    ok: true,
    quoteId,
    quote,
    display: {
      fromSymbol: fromSymbol || "",
      toSymbol: toSymbol || "",
      amountInFormatted: q.amountInFormatted || body.amountIn,
      amountOutFormatted: q.amountOutFormatted || "",
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
