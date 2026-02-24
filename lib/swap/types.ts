import type { Result } from "@/lib/actions/types";

/**
 * Token entity for cryptocurrency swaps
 */
export interface Token {
  id?: string;
  assetId?: string;
  symbol: string;
  decimals: number;
  blockchain: string;
  logo?: string;
}

/**
 * Swap quote display data
 */
export interface SwapQuoteDisplay {
  fromSymbol: string;
  toSymbol: string;
  amountInFormatted: string;
  amountOutFormatted: string;
  amountInUsd?: number;
  amountOutUsd?: number;
  timeEstimate: string;
  minAmountOut?: string;
}

/**
 * Swap quote data (success payload)
 */
export interface SwapQuoteData {
  quoteId: string | null;
  quote: {
    amountInFormatted: string;
    amountOutFormatted: string;
    amountInUsd?: number;
    amountOutUsd?: number;
    timeEstimate?: number;
    minAmountOut?: string;
    depositAddress?: string;
    depositMemo?: string;
  };
  display: SwapQuoteDisplay;
}

/**
 * Confirmed swap deposit structure
 */
export interface SwapDeposit {
  address: string;
  mode?: string;
  amountBaseUnits: string;
  amountDecimal: string;
  originAsset: string;
  decimals: number;
}

/**
 * Swap confirm data (success payload)
 */
export interface SwapConfirmData {
  deposit: SwapDeposit;
  paymentUri: string;
  statusKey: {
    depositAddress: string;
  };
  display: {
    amountInFormatted: string;
    amountOutFormatted?: string;
    timeEstimateSec?: number;
  };
}

/**
 * Quote data stored in context (quote result or confirm result)
 */
export type SwapContextQuoteData =
  | Result<SwapQuoteData>
  | Result<SwapConfirmData>
  | null;

/**
 * Swap status data from API
 */
export interface SwapStatusData {
  status: string;
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
    quote?: {
      amountOutFormatted?: string;
      depositAddress?: string;
      timeEstimate?: number;
      deadline?: string;
    };
  };
  updatedAt?: string;
}
