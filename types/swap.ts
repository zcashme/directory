// Swap and quote-related type definitions

import type { Token } from "./index";

/**
 * Quote request payload (user input)
 */
export interface SwapQuoteRequest {
  fromToken: string; // Token ID/asset string
  toToken: string; // Token ID/asset string
  amountIn: string; // Decimal amount as string
  destAddress: string; // Destination address
  refundAddress: string; // Refund address on origin chain
  slippageTolerance?: number | string; // Percentage (e.g., 0.5 for 0.5%)
}

/**
 * Internal quote payload (sent to 1Click API)
 */
export interface QuotePayload {
  dry: boolean; // true = quote only, false = confirm swap
  swapType: "EXACT_INPUT";
  slippageTolerance: number; // Basis points (0-10000)
  originAsset: string; // Asset ID
  destinationAsset: string; // Asset ID
  amount: string; // Base units as string/bigint
  depositType: "ORIGIN_CHAIN";
  refundTo: string; // Refund address
  refundType: "ORIGIN_CHAIN";
  recipient: string; // Destination address
  recipientType: "DESTINATION_CHAIN";
  deadline: string; // ISO date string
  quoteWaitingTimeMs: number; // Polling timeout (3000ms)
  error?: string; // Error message if payload invalid
}

/**
 * API Quote response structure from 1Click
 */
export interface QuoteResponse {
  id?: string;
  quoteId?: string; // Quote identifier
  amountInFormatted?: string; // Formatted input amount
  amountOutFormatted?: string; // Formatted output amount
  amountInUsd?: number;
  amountInUSD?: number; // Alternative field name
  amountInFiat?: number; // Alternative field name
  amountOutUsd?: number;
  amountOutUSD?: number; // Alternative field name
  amountOutFiat?: number; // Alternative field name
  timeEstimate?: number; // Seconds
  timeEstimateSec?: number; // Alternative field name
  estimatedTimeSeconds?: number; // Alternative field name
  minAmountOut?: string;
  minimumAmountOut?: string; // Alternative field name
  depositAddress?: string; // Where to send funds
  depositMode?: string; // Deposit mechanism
  depositMemo?: string; // Optional memo
  amountToDeposit?: string; // Base units
  requiredDepositAmount?: string; // Base units
  depositAmount?: string; // Base units
  amountIn?: string; // Base units fallback
  error?: string; // Error message from API
  [key: string]: unknown; // Other API-specific fields
}

/**
 * Frontend quote display structure
 */
export interface SwapQuoteDisplay {
  fromSymbol: string; // Token symbol
  toSymbol: string; // Token symbol
  amountInFormatted: string; // Display amount
  amountOutFormatted: string; // Display amount
  amountInUsd?: number;
  amountOutUsd?: number;
  timeEstimate: string; // Formatted (e.g., "~5 minutes")
  minAmountOut?: string;
}

/**
 * Success response from getSwapQuote action
 */
export interface SwapQuoteSuccess {
  ok: true;
  quoteId: string | null;
  quote: QuoteResponse;
  display: SwapQuoteDisplay;
  requestDebug: {
    originAsset: string;
    destinationAsset: string;
    amount: string;
    slippageTolerance: number;
    deadline: string;
  };
}

/**
 * Error response from getSwapQuote action
 */
export interface SwapQuoteError {
  ok: false;
  error: string;
  retryable: boolean;
}

/**
 * Discriminated union for swap quote responses
 */
export type SwapQuoteResponse = SwapQuoteSuccess | SwapQuoteError;

/**
 * Confirmed swap deposit structure
 */
export interface SwapDeposit {
  address: string; // Deposit address
  mode?: string; // Deposit mode
  amountBaseUnits: string; // Amount in base units
  amountDecimal: string; // Amount in decimal format
  originAsset: string; // Asset ID
  decimals: number;
}

/**
 * Success response from confirmSwapAction
 */
export interface SwapConfirmSuccess {
  ok: true;
  deposit: SwapDeposit;
  paymentUri: string; // Payment URI (bitcoin:, ethereum:, solana:, or address)
  statusKey: {
    depositAddress: string; // For tracking swap status
  };
  display: {
    amountInFormatted: string;
    amountOutFormatted?: string;
    timeEstimateSec?: number;
  };
}

/**
 * Error response from confirmSwapAction
 */
export interface SwapConfirmError {
  ok: false;
  error: string;
  retryable: boolean;
}

/**
 * Discriminated union for swap confirm responses
 */
export type SwapConfirmResponse = SwapConfirmSuccess | SwapConfirmError;

/**
 * Swap status polling response from API
 */
export interface SwapStatusData {
  status: string; // "PENDING_DEPOSIT" | "PROCESSING" | "SUCCESS" | "INCOMPLETE_DEPOSIT" | "REFUNDED" | "FAILED"
  swapDetails?: {
    amountInFormatted?: string;
    amountInUsd?: number;
    amountOutFormatted?: string;
    amountOutUsd?: number;
  };
  quoteResponse?: {
    quoteRequest?: {
      originAsset: string;
      destinationAsset: string;
      refundTo: string;
    };
    quote?: QuoteResponse;
  };
  updatedAt?: string; // ISO timestamp
  error?: string;
  [key: string]: unknown;
}

/**
 * UI-mapped swap status
 */
export type UISwapStatus = "PENDING_SWAP" | "SWAP_SUCCESS" | "SWAP_FAILED";

/**
 * Swap state in context
 */
export interface SwapState {
  tokens: Token[];
  selectedOriginToken: Token | null;
  selectedDestToken: Token | null;
  amountIn: string;
  destAddress: string;
  refundAddress: string;
  slippageTolerance: string;
  quote: QuoteResponse | null;
  quoteId: string | null;
  deposit: SwapDeposit | null;
  paymentUri: string | null;
  statusKey: { depositAddress: string } | null;
  isLoadingQuote: boolean;
  isConfirming: boolean;
  error: string | null;
}

/**
 * Token lookup result
 */
export interface TokenLookupResult {
  tokens: Token[];
  error?: null;
}

/**
 * Token lookup error
 */
export interface TokenLookupError {
  tokens?: undefined;
  error: string;
  retryable?: boolean;
}

/**
 * Discriminated union for token lookup
 */
export type TokenLookupResponse = TokenLookupResult | TokenLookupError;
