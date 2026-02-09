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
import { validateAddressForBlockchain } from "./addressValidation";
import { getUserFriendlyErrorMessage } from "./errorMessages";
import type { SwapQuoteRequest, SwapConfirmResponse } from "@/lib/swap/types";

// Payment URI builder: creates proper URIs for BTC, ETH, SOL; falls back to address-only for others.
function buildPaymentUri(originSymbolOrChain: string | undefined, address: string, amountDecimal: string): string {
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

export async function confirmSwapAction(body: SwapQuoteRequest): Promise<SwapConfirmResponse> {
  const tokensPayload = await getCachedTokens();
  if ("error" in tokensPayload && tokensPayload.error) {
    const friendlyError = getUserFriendlyErrorMessage(tokensPayload.error);
    return { ok: false, error: friendlyError, retryable: true };
  }

  const payload = buildQuotePayload(body, { dry: false, tokensPayload });
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

  const resp = await oneclickQuote(payload);
  if ("error" in resp) {
    const friendlyError = getUserFriendlyErrorMessage(resp.error);
    return { ok: false, error: friendlyError, retryable: true };
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

  const originTokenInfo = findToken(tokensPayload, payload.originAsset);
  const decimals = Number(originTokenInfo?.decimals ?? 8);
  const amountDecimal = baseUnitsToDecimal(String(depositAmountBase), decimals);

  const originSymbol = originTokenInfo?.symbol || originTokenInfo?.ticker || payload.originAsset;
  const paymentUri = buildPaymentUri(originSymbol, depositAddress, amountDecimal);

  // Safety check for BTC direction bugs
  if (String(originSymbol).toUpperCase() === "BTC") {
    const a = String(depositAddress);
    const looksBtc = a.startsWith("bc1") || a.startsWith("1") || a.startsWith("3");
    if (!looksBtc) {
      return { ok: false, error: "Invalid payment address. Please try again.", retryable: true };
    }
  }

  return {
    ok: true,
    deposit: {
      address: depositAddress,
      mode: depositMode ?? undefined,
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
}
