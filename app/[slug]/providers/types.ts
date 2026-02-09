import type {
  SwapConfirmResponse,
  SwapContextQuoteData,
  SwapQuoteDisplay,
  SwapQuoteResponse,
} from "@/lib/swap/types";
import type { PendingEdits, PendingEditsField, PendingEditValue } from "@/lib/profile/types";

/**
 * Selection context type - manages QR code display state
 */
export interface SelectionContextType {
  forceShowQR: boolean;
  setForceShowQR: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Edits context type - manages pending profile edits
 */
export interface EditsContextType {
  pendingEdits: PendingEdits;
  setPendingEdits: React.Dispatch<React.SetStateAction<PendingEdits>>;
  editChangesRequested: boolean;
  setEditChangesRequested: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Messaging context type - manages memo/payment draft and verification state
 */
export interface MessagingContextType {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  draft: {
    memo: string;
    amount: string;
  };
  setDraft: React.Dispatch<React.SetStateAction<{ memo: string; amount: string }>>;
  verify: {
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  };
  setVerify: React.Dispatch<React.SetStateAction<{ memo: string; amount: string; zId: number | null; requestId: string | null }>>;
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
  quoteData: SwapContextQuoteData;
  quotePreview: SwapQuoteDisplay | null;
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  swapStatus: string;
  isGettingQuote: boolean;
  isConfirming: boolean;
  quoteStatus: string;
  swapError: string;
  isSwapMode: boolean;
  setTokenOptions: React.Dispatch<React.SetStateAction<Token[]>>;
  setOriginTokenId: React.Dispatch<React.SetStateAction<string | null>>;
  setZecTokenId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoadingTokens: React.Dispatch<React.SetStateAction<boolean>>;
  setSwapAmount: React.Dispatch<React.SetStateAction<string>>;
  setRefundAddress: React.Dispatch<React.SetStateAction<string>>;
  setSlippageTolerance: React.Dispatch<React.SetStateAction<string>>;
  setQuoteData: React.Dispatch<React.SetStateAction<SwapContextQuoteData>>;
  setQuotePreview: React.Dispatch<React.SetStateAction<SwapQuoteDisplay | null>>;
  setDepositUri: React.Dispatch<React.SetStateAction<string>>;
  setStatusKey: React.Dispatch<React.SetStateAction<{ depositAddress: string } | null>>;
  setSwapStatus: React.Dispatch<React.SetStateAction<string>>;
  setIsGettingQuote: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConfirming: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteStatus: React.Dispatch<React.SetStateAction<string>>;
  setSwapError: React.Dispatch<React.SetStateAction<string>>;
  getQuote: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<SwapQuoteResponse | null>;
  confirmSwap: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<SwapConfirmResponse | null>;
  resetSwapState: () => void;
  loadTokens: () => Promise<void>;
}
