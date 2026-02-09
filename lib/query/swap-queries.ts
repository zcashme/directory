import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { getSwapTokens } from '@/lib/swap/fetchTokens';
import { getSwapQuote } from '@/lib/swap/quoteAction';
import { confirmSwapAction } from '@/lib/swap/confirmAction';
import type { Token } from '@/lib/swap/types';

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
 * Hook to fetch and cache swap tokens
 * Tokens are cached for 5 minutes (see queryClient config)
 */
export function useSwapTokens() {
  return useQuery({
    queryKey: ['swap-tokens'],
    queryFn: async () => {
      const result = await getSwapTokens();
      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to load tokens');
      }
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook for getting a swap quote
 */
export function useGetSwapQuote() {
  return useMutation({
    mutationFn: async (params: {
      fromToken: string;
      toToken: string;
      amountIn: string;
      destAddress: string;
      refundAddress: string;
      slippageTolerance: string;
    }) => {
      const result = await getSwapQuote(params);
      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to get quote');
      }
      return result;
    },
  });
}

/**
 * Mutation hook for confirming a swap
 */
export function useConfirmSwap() {
  return useMutation({
    mutationFn: async (params: {
      fromToken: string;
      toToken: string;
      amountIn: string;
      destAddress: string;
      refundAddress: string;
      slippageTolerance: string;
    }) => {
      const result = await confirmSwapAction(params);
      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to confirm swap');
      }
      return result;
    },
  });
}
