/**
 * Token entity for cryptocurrency swaps
 */
export interface Token {
  id?: string;
  assetId?: string;
  tokenId?: string;
  asset?: string;
  symbol: string;
  ticker?: string;
  decimals: number;
  blockchain: string;
  [key: string]: unknown;
}

/**
 * Quote request payload (user input)
 */
export interface SwapQuoteRequest {
  fromToken: string;
  toToken: string;
  amountIn: string;
  destAddress: string;
  refundAddress: string;
  slippageTolerance?: number | string;
}

/**
 * Internal quote payload (sent to 1Click API)
 */
export interface QuotePayload {
  dry: boolean;
  swapType: "EXACT_INPUT";
  slippageTolerance: number;
  originAsset: string;
  destinationAsset: string;
  amount: string;
  depositType: "ORIGIN_CHAIN";
  refundTo: string;
  refundType: "ORIGIN_CHAIN";
  recipient: string;
  recipientType: "DESTINATION_CHAIN";
  deadline: string;
  quoteWaitingTimeMs: number;
  error?: string;
}

/**
 * API Quote response structure from 1Click
 */
export interface QuoteResponse {
  id?: string;
  quoteId?: string;
  amountInFormatted?: string;
  amountOutFormatted?: string;
  amountInUsd?: number;
  amountInUSD?: number;
  amountInFiat?: number;
  amountOutUsd?: number;
  amountOutUSD?: number;
  amountOutFiat?: number;
  timeEstimate?: number;
  timeEstimateSec?: number;
  estimatedTimeSeconds?: number;
  minAmountOut?: string;
  minimumAmountOut?: string;
  depositAddress?: string;
  depositMode?: string;
  depositMemo?: string;
  amountToDeposit?: string;
  requiredDepositAmount?: string;
  depositAmount?: string;
  amountIn?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Frontend quote display structure
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
  address: string;
  mode?: string;
  amountBaseUnits: string;
  amountDecimal: string;
  originAsset: string;
  decimals: number;
}

/**
 * Success response from confirmSwapAction
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
    quote?: QuoteResponse;
  };
  updatedAt?: string;
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
