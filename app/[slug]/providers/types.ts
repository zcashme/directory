import type { Token } from "@/lib/swap/types";
import type { SwapQuoteDisplay } from "@/lib/swap/types";
import type { PendingEdits, PendingEditsField, PendingEditValue } from "@/lib/profile/types";

/**
 * Selection context type - manages QR code display state
 */
export interface SelectionContextType {
  forceShowQR: boolean;
  setForceShowQR: (_value: boolean) => void;
}

/**
 * Edits context type - manages pending profile edits
 */
export interface EditsContextType {
  pendingEdits: PendingEdits;
  setPendingEdits: (field: PendingEditsField, value: PendingEditValue) => void;
  clearPendingEdits: () => void;
  editChangesRequested: boolean;
  setEditChangesRequested: (_value: boolean) => void;
}

/**
 * Messaging context type - manages memo/payment draft and verification state
 */
export interface MessagingContextType {
  mode: string;
  setMode: (_mode: string) => void;
  draft: {
    memo: string;
    amount: string;
  };
  verify: {
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  };
  setDraftMemo: (_memo: string | null) => void;
  setDraftAmount: (_amount: string | null) => void;
  setVerifyMemo: (_memo: string | null) => void;
  setVerifyAmount: (_amount: string | null) => void;
  setVerifyId: (_zId: number | null) => void;
  setVerifyRequestId: (_requestId: string | null) => void;
}

/**
 * Swap context type - manages cryptocurrency swap workflow
 */
export interface SwapContextType {
  tokenOptions: Token[];
  originTokenId: string | null;
  originSymbol: string;
  zecTokenId: string | null;
  isLoadingTokens: boolean;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;
  quoteData: unknown | null;
  quotePreview: SwapQuoteDisplay | null;
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  swapStatus: string;
  isGettingQuote: boolean;
  isConfirming: boolean;
  quoteStatus: string;
  swapError: string;
  isSwapMode: boolean;
  setToken: (_tokenId: string) => void;
  setSwapAmount: (_amount: string) => void;
  setRefundAddress: (_address: string) => void;
  setSlippageTolerance: (_slippage: string) => void;
  getQuote: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<unknown | null>;
  confirmSwap: (_params: {
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
