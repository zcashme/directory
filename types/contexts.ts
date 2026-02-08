// Context provider type definitions

import type { Token } from "./index";
import type { SwapQuoteDisplay } from "./swap";

/**
 * Selection context type - manages QR code display state
 */
export interface SelectionContextType {
  forceShowQR: boolean;
  setForceShowQR: (value: boolean) => void;
}

/**
 * Edits context type - manages pending profile edits
 */
export interface EditsContextType {
  pendingEdits: Record<string, unknown>;
  setPendingEdits: (field: string, value: unknown) => void;
  clearPendingEdits: () => void;
  editChangesRequested: boolean;
  setEditChangesRequested: (value: boolean) => void;
}

/**
 * Messaging context type - manages memo/payment draft and verification state
 */
export interface MessagingContextType {
  // Mode state
  mode: string; // "note" | "verify" | other modes
  setMode: (mode: string) => void;

  // Draft state (for composing a new memo)
  draft: {
    memo: string;
    amount: string;
  };

  // Verify state (for verifying received payment)
  verify: {
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  };

  // Draft setters
  setDraftMemo: (memo: string | null) => void;
  setDraftAmount: (amount: string | null) => void;

  // Verify setters
  setVerifyMemo: (memo: string | null) => void;
  setVerifyAmount: (amount: string | null) => void;
  setVerifyId: (zId: number | null) => void;
  setVerifyRequestId: (requestId: string | null) => void;
}

/**
 * Swap context type - manages cryptocurrency swap workflow
 */
export interface SwapContextType {
  // Token state
  tokenOptions: Token[];
  originTokenId: string | null;
  originSymbol: string;
  zecTokenId: string | null;
  isLoadingTokens: boolean;

  // Swap input state
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;

  // Quote state
  quoteData: unknown | null; // Full quote response
  quotePreview: SwapQuoteDisplay | null; // Display-friendly quote
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  swapStatus: string;

  // UI state
  isGettingQuote: boolean;
  isConfirming: boolean;
  quoteStatus: string;
  swapError: string;

  // Computed values
  isSwapMode: boolean;

  // Actions
  setToken: (tokenId: string) => void;
  setSwapAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setSlippageTolerance: (slippage: string) => void;
  getQuote: (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<unknown | null>;
  confirmSwap: (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<unknown | null>;
  resetSwapState: () => void;
  loadTokens: () => Promise<void>;
}
