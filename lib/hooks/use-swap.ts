import { useCallback, useMemo, useEffect } from 'react';
import { useSwapTokens, useGetSwapQuote, useConfirmSwap } from '@/lib/query/swap-queries';
import { useSwapStore } from '@/lib/stores/swap-store';
import { getTokenId } from '@/lib/swap/swapPayload';
import type {
  Token,
  SwapContextQuoteData,
  SwapQuoteDisplay,
  SwapQuoteResponse,
  SwapConfirmResponse
} from '@/lib/swap/types';

/**
 * Swap context type - manages cryptocurrency swap workflow
 * This interface maintains compatibility with the old SwapProvider API
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
};

/**
 * Compatibility hook that provides the same API as the old SwapProvider
 * Merges TanStack Query data with Zustand store state
 */
export function useSwap(): SwapContextType {
  // TanStack Query hooks
  const { data: tokens = [], isLoading: isLoadingTokens, refetch: refetchTokens } = useSwapTokens();
  const getQuoteMutation = useGetSwapQuote();
  const confirmSwapMutation = useConfirmSwap();

  // Zustand store
  const {
    originTokenId,
    swapAmount,
    refundAddress,
    slippageTolerance,
    quoteData,
    quotePreview,
    depositUri,
    statusKey,
    swapStatus,
    quoteStatus,
    swapError,
    setOriginTokenId,
    setSwapAmount,
    setRefundAddress,
    setSlippageTolerance,
    setQuoteData,
    setQuotePreview,
    setDepositUri,
    setStatusKey,
    setSwapStatus,
    setQuoteStatus,
    setSwapError,
    resetSwapState: resetSwapStateStore,
  } = useSwapStore();

  // Find ZEC token ID
  const zecTokenId = useMemo(() => {
    const zecToken = tokens.find(
      (token) =>
        (token.symbol ?? token.ticker ?? '').toUpperCase() === 'ZEC' &&
        (token.blockchain ?? '').toLowerCase().includes('zec')
    );
    return zecToken ? getTokenId(zecToken) : null;
  }, [tokens]);

  // Set initial originTokenId to ZEC when tokens load
  useEffect(() => {
    if (zecTokenId && !originTokenId) {
      setOriginTokenId(zecTokenId);
    }
  }, [zecTokenId, originTokenId, setOriginTokenId]);

  // Computed values
  const selectedOriginToken = useMemo(
    () => tokens.find((t) => getTokenId(t) === originTokenId),
    [tokens, originTokenId]
  );

  const originSymbol = useMemo(
    () => selectedOriginToken?.symbol ?? selectedOriginToken?.ticker ?? 'ZEC',
    [selectedOriginToken]
  );

  const isSwapMode = useMemo(
    () => originTokenId !== null && zecTokenId !== null && originTokenId !== zecTokenId,
    [originTokenId, zecTokenId]
  );

  // Get quote action
  const getQuote = useCallback(
    async (params: {
      amountIn: string;
      destAddress: string;
      fromToken?: string;
      toToken?: string;
      refund?: string;
      slippage?: string;
    }) => {
      const { amountIn, destAddress, fromToken, toToken, refund, slippage } = params;

      if (!isSwapMode) return null;

      setSwapError('');
      setQuoteStatus('Getting quote...');
      setQuoteData(null);
      setQuotePreview(null);

      try {
        const result = await getQuoteMutation.mutateAsync({
          fromToken: fromToken ?? originTokenId ?? '',
          toToken: toToken ?? zecTokenId ?? '',
          amountIn,
          destAddress,
          refundAddress: refund ?? refundAddress,
          slippageTolerance: slippage ?? slippageTolerance,
        });

        setQuotePreview(result.display);
        setQuoteData(result);
        setQuoteStatus('Quote ready');
        return result;
      } catch (error) {
        setSwapError(getErrorMessage(error, 'Failed to get quote'));
        setQuoteStatus('');
        return null;
      }
    },
    [
      isSwapMode,
      originTokenId,
      zecTokenId,
      refundAddress,
      slippageTolerance,
      getQuoteMutation,
      setSwapError,
      setQuoteStatus,
      setQuoteData,
      setQuotePreview,
    ]
  );

  // Confirm swap action
  const confirmSwap = useCallback(
    async (params: {
      amountIn: string;
      destAddress: string;
      fromToken?: string;
      toToken?: string;
      refund?: string;
      slippage?: string;
    }) => {
      const { amountIn, destAddress, fromToken, toToken, refund, slippage } = params;

      if (!isSwapMode) return null;

      setSwapError('');
      setQuoteStatus('Confirming swap...');

      try {
        const result = await confirmSwapMutation.mutateAsync({
          fromToken: fromToken ?? originTokenId ?? '',
          toToken: toToken ?? zecTokenId ?? '',
          amountIn,
          destAddress,
          refundAddress: refund ?? refundAddress,
          slippageTolerance: slippage ?? slippageTolerance,
        });

        setDepositUri(result.paymentUri ?? result.deposit?.address ?? '');
        setStatusKey(result.statusKey);
        setQuoteData(result);
        setSwapStatus('PENDING_DEPOSIT');
        setQuoteStatus('Swap confirmed!');

        return result;
      } catch (error) {
        setSwapError(getErrorMessage(error, 'Failed to confirm swap'));
        setQuoteStatus('');
        return null;
      }
    },
    [
      isSwapMode,
      originTokenId,
      zecTokenId,
      refundAddress,
      slippageTolerance,
      confirmSwapMutation,
      setSwapError,
      setQuoteStatus,
      setDepositUri,
      setStatusKey,
      setQuoteData,
      setSwapStatus,
    ]
  );

  // Reset swap state
  const resetSwapState = useCallback(() => {
    resetSwapStateStore(zecTokenId);
  }, [zecTokenId, resetSwapStateStore]);

  // Load tokens (refetch from cache or network)
  const loadTokens = useCallback(async () => {
    await refetchTokens();
  }, [refetchTokens]);

  // Return the same interface as the old SwapProvider
  return {
    // Token state
    tokenOptions: tokens,
    originTokenId,
    originSymbol,
    zecTokenId,
    isLoadingTokens,

    // Swap state
    swapAmount,
    refundAddress,
    slippageTolerance,
    quoteData,
    quotePreview,
    depositUri,
    statusKey,
    swapStatus,

    // UI state
    isGettingQuote: getQuoteMutation.isPending,
    isConfirming: confirmSwapMutation.isPending,
    quoteStatus,
    swapError,

    // Computed
    isSwapMode,

    // Setters
    setTokenOptions: () => {}, // No-op: tokens managed by TanStack Query
    setOriginTokenId,
    setZecTokenId: () => {}, // No-op: zecTokenId is computed
    setIsLoadingTokens: () => {}, // No-op: loading state managed by TanStack Query
    setSwapAmount,
    setRefundAddress,
    setSlippageTolerance,
    setQuoteData,
    setQuotePreview,
    setDepositUri,
    setStatusKey,
    setSwapStatus,
    setIsGettingQuote: () => {}, // No-op: managed by mutation
    setIsConfirming: () => {}, // No-op: managed by mutation
    setQuoteStatus,
    setSwapError,

    // Async actions
    getQuote,
    confirmSwap,
    resetSwapState,
    loadTokens,
  };
}
