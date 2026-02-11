import { create } from 'zustand';
import type { Token, SwapQuoteDisplay } from '@/lib/swap/types';
import { getSwapTokens } from '@/lib/swap/oneClick';
import { getRateAction } from '@/lib/rates/getRateAction';

/**
 * Swaps store - manages all swap-related state including tokens, amounts, addresses, quotes, and exchange rates
 */
interface SwapsState {
  // Tokens state
  tokens: Token[];
  tokensLoading: boolean;
  tokensError: string | null;

  // Token selection
  fromToken: Token | null;
  toToken: Token | null;

  // Amount inputs
  fromAmount: string;
  toAmount: string;

  // Addresses
  refundAddress: string;
  destAddress: string;

  // Quote state
  quote: SwapQuoteDisplay | null;
  quoteLoading: boolean;
  quoteError: string | null;
  confirmLoading: boolean;

  // Settings
  slippageTolerance: string;

  // UI state
  showInfo: boolean;

  // Exchange rate state
  exchangeRate: number;
  rateFetched: boolean;

  // Actions
  loadTokens: () => Promise<void>;
  setFromToken: (token: Token | null) => void;
  setToToken: (token: Token | null) => void;
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setDestAddress: (address: string) => void;
  setSlippageTolerance: (tolerance: string) => void;
  setQuote: (quote: SwapQuoteDisplay | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setQuoteError: (error: string | null) => void;
  setConfirmLoading: (loading: boolean) => void;
  setShowInfo: (show: boolean) => void;
  setExchangeRate: (rate: number) => void;
  setRateFetched: (fetched: boolean) => void;
  swapDirection: () => void;
  resetQuote: () => void;
  findToken: (symbol: string, blockchain: string) => Token | undefined;
  fetchExchangeRate: (symbol: string) => Promise<void>;
}

export const useSwapsStore = create<SwapsState>((set, get) => ({
  // Initial state
  tokens: [],
  tokensLoading: false,
  tokensError: null,
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
  refundAddress: '',
  destAddress: '',
  quote: null,
  quoteLoading: false,
  quoteError: null,
  confirmLoading: false,
  slippageTolerance: '1',
  showInfo: false,
  exchangeRate: 1,
  rateFetched: false,

  // Actions
  loadTokens: async () => {
    set({ tokensLoading: true, tokensError: null });
    try {
      const result = await getSwapTokens();
      if ('error' in result) {
        set({ tokensError: result.error, tokensLoading: false });
        return;
      }

      set({ tokens: result.tokens });

      // Set default tokens: ETH and ZEC
      const ethToken = result.tokens.find(t => t.symbol === 'ETH');
      const zecToken = result.tokens.find(t => t.symbol === 'ZEC');

      set({
        fromToken: ethToken || null,
        toToken: zecToken || null,
        tokensLoading: false,
      });
    } catch (err) {
      set({ tokensError: 'Failed to load tokens', tokensLoading: false });
    }
  },

  setFromToken: (token) => set({ fromToken: token }),
  setToToken: (token) => set({ toToken: token }),
  setFromAmount: (amount) => set({ fromAmount: amount }),
  setToAmount: (amount) => set({ toAmount: amount }),
  setRefundAddress: (address) => set({ refundAddress: address }),
  setDestAddress: (address) => set({ destAddress: address }),
  setSlippageTolerance: (tolerance) => set({ slippageTolerance: tolerance }),
  setQuote: (quote) => set({ quote }),
  setQuoteLoading: (loading) => set({ quoteLoading: loading }),
  setQuoteError: (error) => set({ quoteError: error }),
  setConfirmLoading: (loading) => set({ confirmLoading: loading }),
  setShowInfo: (show) => set({ showInfo: show }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  setRateFetched: (fetched) => set({ rateFetched: fetched }),

  swapDirection: () => {
    const state = get();
    set({
      fromToken: state.toToken,
      toToken: state.fromToken,
      fromAmount: state.toAmount,
      toAmount: state.fromAmount,
      quote: null,
      quoteError: null,
    });
  },

  resetQuote: () => {
    set({
      quote: null,
      quoteError: null,
    });
  },

  findToken: (symbol, blockchain) => {
    const state = get();
    return state.tokens.find(
      (t) => t.symbol === symbol && t.blockchain === blockchain
    );
  },

  fetchExchangeRate: async (symbol) => {
    try {
      const result = await getRateAction('USD', symbol);
      if (result.ok && result.rate && Number.isFinite(result.rate) && result.rate > 0) {
        set({
          exchangeRate: result.rate,
          rateFetched: true,
        });
      }
    } catch {
      // Silent error handling
      set({ rateFetched: false });
    }
  },
}));
