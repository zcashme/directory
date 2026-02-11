import { create } from 'zustand';
import type {
  SwapContextQuoteData,
  SwapQuoteDisplay,
} from '@/lib/swap/types';

interface SwapState {
  currentProfileAddress: string | null;
  originTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;
  quoteData: SwapContextQuoteData;
  quotePreview: SwapQuoteDisplay | null;
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  quoteStatus: string;
  swapError: string;

  ensureProfile: (address: string, zecTokenId: string | null) => void;
  setOriginTokenId: (id: string | null) => void;
  setSwapAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setSlippageTolerance: (tolerance: string) => void;
  setQuoteData: (data: SwapContextQuoteData) => void;
  setQuotePreview: (preview: SwapQuoteDisplay | null) => void;
  setDepositUri: (uri: string) => void;
  setStatusKey: (key: { depositAddress: string } | null) => void;
  setQuoteStatus: (status: string) => void;
  setSwapError: (error: string) => void;
  resetQuote: () => void;
  resetSwapState: (zecTokenId: string | null) => void;
}

export const useSwapStore = create<SwapState>((set, get) => ({
  currentProfileAddress: null,
  originTokenId: null,
  swapAmount: '',
  refundAddress: '',
  slippageTolerance: '1',
  quoteData: null,
  quotePreview: null,
  depositUri: '',
  statusKey: null,
  quoteStatus: '',
  swapError: '',

  ensureProfile: (address, zecTokenId) => {
    if (get().currentProfileAddress !== address) {
      set({
        currentProfileAddress: address,
        originTokenId: zecTokenId,
        swapAmount: '',
        refundAddress: '',
        slippageTolerance: '1',
        quoteData: null,
        quotePreview: null,
        quoteStatus: '',
        depositUri: '',
        statusKey: null,
        swapError: '',
      });
    }
  },
  setOriginTokenId: (id) => set({ originTokenId: id }),
  setSwapAmount: (amount) => set({ swapAmount: amount }),
  setRefundAddress: (address) => set({ refundAddress: address }),
  setSlippageTolerance: (tolerance) => set({ slippageTolerance: tolerance }),
  setQuoteData: (data) => set({ quoteData: data }),
  setQuotePreview: (preview) => set({ quotePreview: preview }),
  setDepositUri: (uri) => set({ depositUri: uri }),
  setStatusKey: (key) => set({ statusKey: key }),
  setQuoteStatus: (status) => set({ quoteStatus: status }),
  setSwapError: (error) => set({ swapError: error }),
  resetQuote: () => set({ quoteData: null, quotePreview: null, quoteStatus: '' }),
  resetSwapState: (zecTokenId) =>
    set({
      originTokenId: zecTokenId,
      swapAmount: '',
      refundAddress: '',
      slippageTolerance: '1',
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      depositUri: '',
      statusKey: null,
      swapError: '',
    }),
}));
