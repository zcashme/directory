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
 * Success response from swap quote
 */
export interface SwapQuoteSuccess {
  ok: true;
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
 * Error response from swap quote
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
  address: string;
  mode?: string;
  amountBaseUnits: string;
  amountDecimal: string;
  originAsset: string;
  decimals: number;
}

/**
 * Success response from swap confirmation
 */
export interface SwapConfirmSuccess {
  ok: true;
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
 * Error response from swap confirmation
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
 * Quote data stored in context (quote result or confirm result)
 */
export type SwapContextQuoteData =
  | SwapQuoteResponse
  | SwapConfirmResponse
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
