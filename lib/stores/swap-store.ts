import { create } from 'zustand';
import type { SwapContextQuoteData, SwapQuoteDisplay } from '@/lib/swap/types';

interface SwapState {
  // Input state (user controls)
  originTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;

  // Quote state
  quoteData: SwapContextQuoteData;
  quotePreview: SwapQuoteDisplay | null;

  // Swap state
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  swapStatus: string;

  // UI state
  quoteStatus: string;
  swapError: string;

  // Setters
  setOriginTokenId: (id: string | null) => void;
  setSwapAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setSlippageTolerance: (tolerance: string) => void;
  setQuoteData: (data: SwapContextQuoteData) => void;
  setQuotePreview: (preview: SwapQuoteDisplay | null) => void;
  setDepositUri: (uri: string) => void;
  setStatusKey: (key: { depositAddress: string } | null) => void;
  setSwapStatus: (status: string) => void;
  setQuoteStatus: (status: string) => void;
  setSwapError: (error: string) => void;
  resetSwapState: (zecTokenId: string | null) => void;
}

export const useSwapStore = create<SwapState>((set) => ({
  // Initial state
  originTokenId: null,
  swapAmount: '',
  refundAddress: '',
  slippageTolerance: '0.5',
  quoteData: null,
  quotePreview: null,
  depositUri: '',
  statusKey: null,
  swapStatus: '',
  quoteStatus: '',
  swapError: '',

  // Setters
  setOriginTokenId: (id) => set({ originTokenId: id }),
  setSwapAmount: (amount) => set({ swapAmount: amount }),
  setRefundAddress: (address) => set({ refundAddress: address }),
  setSlippageTolerance: (tolerance) => set({ slippageTolerance: tolerance }),
  setQuoteData: (data) => set({ quoteData: data }),
  setQuotePreview: (preview) => set({ quotePreview: preview }),
  setDepositUri: (uri) => set({ depositUri: uri }),
  setStatusKey: (key) => set({ statusKey: key }),
  setSwapStatus: (status) => set({ swapStatus: status }),
  setQuoteStatus: (status) => set({ quoteStatus: status }),
  setSwapError: (error) => set({ swapError: error }),
  resetSwapState: (zecTokenId) =>
    set({
      originTokenId: zecTokenId,
      swapAmount: '',
      refundAddress: '',
      slippageTolerance: '0.5',
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      depositUri: '',
      statusKey: null,
      swapStatus: '',
      swapError: '',
    }),
}));
