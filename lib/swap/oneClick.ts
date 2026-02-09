"use server";

import {
  OpenAPI,
  OneClickService,
  ApiError,
  type TokenResponse,
  type QuoteRequest,
  type QuoteResponse as SDKQuoteResponse,
  type GetExecutionStatusResponse,
  type SubmitDepositTxResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import type {
  Token,
  SwapQuoteResponse,
  SwapQuoteSuccess,
  SwapConfirmResponse,
  SwapConfirmSuccess,
  SwapStatusData,
} from "./types";
import { getTokenId, findToken, toBaseUnits, baseUnitsToDecimal } from "./utils";

// Configure SDK
OpenAPI.BASE = "https://1click.chaindefuser.com";
OpenAPI.TOKEN = process.env.ONECLICK_API_KEY;

/**
 * Helper: Extract error message from SDK ApiError
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string; message?: string; detail?: string } | undefined;
    return body?.error || body?.message || body?.detail || err.message || "API error";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
}

/**
 * Helper: Convert SDK TokenResponse to our Token type
 */
function toToken(t: TokenResponse): Token {
  return {
    id: t.assetId,
    assetId: t.assetId,
    symbol: t.symbol,
    decimals: t.decimals,
    blockchain: t.blockchain,
  };
}

/**
 * Helper: Generate ISO deadline timestamp
 */
function deadlineIso(minutes: number = 20): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * Helper: Convert percentage to basis points
 */
function toBasisPoints(value: number | string | null | undefined, defaultBps: number = 50): number {
  const v = parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(v) || v < 0) return defaultBps;
  const bps = Math.round(v * 100);
  return Math.max(0, Math.min(10_000, bps));
}

/**
 * Fetch available swap tokens
 */
export async function getSwapTokens(): Promise<{ tokens: Token[] } | { error: string }> {
  if (!OpenAPI.TOKEN) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  try {
    const allTokens = await OneClickService.getTokens();

    // Filter to allowed symbols
    const allowedSymbols = new Set(["ZEC", "BTC", "ETH", "USDC", "USDT", "SOL"]);
    const filtered = allTokens.filter((t) => allowedSymbols.has(t.symbol));

    // Filter to mainnet only
    const mainnetOnly = filtered.filter(
      (token) =>
        token.blockchain &&
        !token.blockchain.toLowerCase().includes("testnet") &&
        !token.blockchain.toLowerCase().includes("test")
    );

    // Filter out NEAR and restrict ZEC to native chain
    const finalFiltered = mainnetOnly.filter((token) => {
      const blockchain = token.blockchain.toLowerCase();
      const symbol = token.symbol;

      if (blockchain === "near" || blockchain.startsWith("near.")) {
        return false;
      }

      if (symbol === "ZEC" && !blockchain.includes("zec")) {
        return false;
      }

      return true;
    });

    return { tokens: finalFiltered.map(toToken) };
  } catch (err) {
    return { error: extractErrorMessage(err) || "Failed to load tokens" };
  }
}

/**
 * Get swap quote (dry run - no deposit address generated)
 */
export async function getSwapQuote(params: {
  fromToken: string;
  toToken: string;
  amountIn: string;
  destAddress: string;
  refundAddress: string;
  slippageTolerance?: number | string;
  tokens: Token[];
}): Promise<SwapQuoteResponse> {
  if (!OpenAPI.TOKEN) {
    return { ok: false, error: "1Click API key not configured", retryable: false };
  }

  // Validate inputs
  if (!params.fromToken || !params.toToken || !params.amountIn || !params.destAddress || !params.refundAddress) {
    return { ok: false, error: "Missing required fields", retryable: false };
  }

  const originToken = findToken(params.tokens, params.fromToken);
  const destToken = findToken(params.tokens, params.toToken);

  if (!originToken) {
    return { ok: false, error: "From token not found", retryable: false };
  }
  if (!destToken) {
    return { ok: false, error: "To token not found", retryable: false };
  }

  const amountBase = toBaseUnits(params.amountIn, originToken.decimals);
  if (!amountBase) {
    return { ok: false, error: "Amount must be greater than 0", retryable: false };
  }

  try {
    const request: QuoteRequest = {
      dry: true, // Dry run - no deposit address
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: toBasisPoints(params.slippageTolerance, 50),
      originAsset: params.fromToken,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      destinationAsset: params.toToken,
      amount: amountBase,
      refundTo: params.refundAddress,
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipient: params.destAddress,
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
      deadline: deadlineIso(20),
      quoteWaitingTimeMs: 3000,
    };

    const response: SDKQuoteResponse = await OneClickService.getQuote(request);

    const result: SwapQuoteSuccess = {
      ok: true,
      quoteId: response.correlationId,
      quote: {
        amountInFormatted: response.quote.amountInFormatted,
        amountOutFormatted: response.quote.amountOutFormatted,
        amountInUsd: parseFloat(response.quote.amountInUsd) || undefined,
        amountOutUsd: parseFloat(response.quote.amountOutUsd) || undefined,
        timeEstimate: response.quote.timeEstimate,
        minAmountOut: response.quote.minAmountOut,
      },
      display: {
        fromSymbol: originToken.symbol,
        toSymbol: destToken.symbol,
        amountInFormatted: response.quote.amountInFormatted,
        amountOutFormatted: response.quote.amountOutFormatted,
        amountInUsd: parseFloat(response.quote.amountInUsd) || undefined,
        amountOutUsd: parseFloat(response.quote.amountOutUsd) || undefined,
        timeEstimate: response.quote.timeEstimate ? `~${response.quote.timeEstimate}s` : "Unknown",
        minAmountOut: response.quote.minAmountOut,
      },
    };

    return result;
  } catch (err) {
    return {
      ok: false,
      error: extractErrorMessage(err) || "Could not get quote",
      retryable: true,
    };
  }
}

/**
 * Confirm swap and get deposit address (dry=false)
 */
export async function confirmSwap(params: {
  fromToken: string;
  toToken: string;
  amountIn: string;
  destAddress: string;
  refundAddress: string;
  slippageTolerance?: number | string;
  tokens: Token[];
}): Promise<SwapConfirmResponse> {
  if (!OpenAPI.TOKEN) {
    return { ok: false, error: "1Click API key not configured", retryable: false };
  }

  // Validate inputs
  if (!params.fromToken || !params.toToken || !params.amountIn || !params.destAddress || !params.refundAddress) {
    return { ok: false, error: "Missing required fields", retryable: false };
  }

  const originToken = findToken(params.tokens, params.fromToken);
  const destToken = findToken(params.tokens, params.toToken);

  if (!originToken) {
    return { ok: false, error: "From token not found", retryable: false };
  }
  if (!destToken) {
    return { ok: false, error: "To token not found", retryable: false };
  }

  const amountBase = toBaseUnits(params.amountIn, originToken.decimals);
  if (!amountBase) {
    return { ok: false, error: "Amount must be greater than 0", retryable: false };
  }

  try {
    const request: QuoteRequest = {
      dry: false, // Real swap - generates deposit address
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: toBasisPoints(params.slippageTolerance, 50),
      originAsset: params.fromToken,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      destinationAsset: params.toToken,
      amount: amountBase,
      refundTo: params.refundAddress,
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipient: params.destAddress,
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
      deadline: deadlineIso(20),
      quoteWaitingTimeMs: 3000,
    };

    const response: SDKQuoteResponse = await OneClickService.getQuote(request);

    if (!response.quote.depositAddress) {
      return { ok: false, error: "No deposit address received", retryable: true };
    }

    // Build payment URI based on blockchain
    const blockchain = originToken.blockchain.toLowerCase();
    let paymentUri = "";

    if (blockchain.includes("btc") || blockchain.includes("bitcoin")) {
      paymentUri = `bitcoin:${response.quote.depositAddress}?amount=${baseUnitsToDecimal(amountBase, originToken.decimals)}`;
    } else if (blockchain.includes("eth") || blockchain.includes("ethereum") || blockchain.includes("arb") || blockchain.includes("base")) {
      paymentUri = `ethereum:${response.quote.depositAddress}@1?value=${amountBase}`;
    } else if (blockchain.includes("sol") || blockchain.includes("solana")) {
      paymentUri = `solana:${response.quote.depositAddress}?amount=${baseUnitsToDecimal(amountBase, originToken.decimals)}`;
    } else {
      paymentUri = response.quote.depositAddress;
    }

    const result: SwapConfirmSuccess = {
      ok: true,
      deposit: {
        address: response.quote.depositAddress,
        mode: response.quote.depositMemo ? "MEMO" : "SIMPLE",
        amountBaseUnits: amountBase,
        amountDecimal: baseUnitsToDecimal(amountBase, originToken.decimals),
        originAsset: params.fromToken,
        decimals: originToken.decimals,
      },
      paymentUri,
      statusKey: {
        depositAddress: response.quote.depositAddress,
      },
      display: {
        amountInFormatted: response.quote.amountInFormatted,
        amountOutFormatted: response.quote.amountOutFormatted,
        timeEstimateSec: response.quote.timeEstimate,
      },
    };

    return result;
  } catch (err) {
    return {
      ok: false,
      error: extractErrorMessage(err) || "Could not confirm swap",
      retryable: true,
    };
  }
}

/**
 * Check swap execution status
 */
export async function getSwapStatus(depositAddress: string, depositMemo?: string): Promise<SwapStatusData | { error: string }> {
  if (!OpenAPI.TOKEN) {
    return { error: "1Click API key not configured" };
  }

  if (!depositAddress) {
    return { error: "Deposit address is required" };
  }

  try {
    const response: GetExecutionStatusResponse = await OneClickService.getExecutionStatus(depositAddress, depositMemo);

    return {
      status: response.status,
      swapDetails: {
        amountInFormatted: response.swapDetails.amountInFormatted,
        amountInUsd: response.swapDetails.amountInUsd ? parseFloat(response.swapDetails.amountInUsd) : undefined,
        amountOutFormatted: response.swapDetails.amountOutFormatted,
        amountOutUsd: response.swapDetails.amountOutUsd ? parseFloat(response.swapDetails.amountOutUsd) : undefined,
      },
      quoteResponse: {
        quoteRequest: {
          originAsset: response.quoteResponse.quoteRequest.originAsset,
          destinationAsset: response.quoteResponse.quoteRequest.destinationAsset,
          refundTo: response.quoteResponse.quoteRequest.refundTo,
        },
        quote: {
          amountOutFormatted: response.quoteResponse.quote.amountOutFormatted,
          depositAddress: response.quoteResponse.quote.depositAddress,
          timeEstimate: response.quoteResponse.quote.timeEstimate,
          deadline: response.quoteResponse.quote.deadline,
        },
      },
      updatedAt: response.updatedAt,
    };
  } catch (err) {
    return { error: extractErrorMessage(err) || "Could not check swap status" };
  }
}

/**
 * Submit deposit transaction hash (optional - speeds up processing)
 */
export async function submitDepositTx(txHash: string, depositAddress: string): Promise<{ success: boolean; error?: string }> {
  if (!OpenAPI.TOKEN) {
    return { success: false, error: "1Click API key not configured" };
  }

  try {
    await OneClickService.submitDepositTx({
      txHash,
      depositAddress,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) || "Could not submit transaction" };
  }
}
