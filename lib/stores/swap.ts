import { create } from 'zustand';
import type {
  SwapContextQuoteData,
  SwapQuoteDisplay,
  Token,
} from '@/lib/swap/types';

interface SwapState {
  currentProfileAddress: string | null;
  tokens: Token[];
  originTokenId: string | null;
  destinationTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  destAddress: string;
  slippageTolerance: string;
  quoteData: SwapContextQuoteData;
  quotePreview: SwapQuoteDisplay | null;
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  quoteStatus: string;
  swapError: string;

  ensureProfile: (address: string, zecTokenId: string | null) => void;
  setTokens: (tokens: Token[]) => void;
  setOriginTokenId: (id: string | null) => void;
  setDestinationTokenId: (id: string | null) => void;
  setSwapAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setDestAddress: (address: string) => void;
  setSlippageTolerance: (tolerance: string) => void;
  setQuoteData: (data: SwapContextQuoteData) => void;
  setQuotePreview: (preview: SwapQuoteDisplay | null) => void;
  setDepositUri: (uri: string) => void;
  setStatusKey: (key: { depositAddress: string } | null) => void;
  setQuoteStatus: (status: string) => void;
  setSwapError: (error: string) => void;
  swapDirection: () => void;
  resetQuote: () => void;
  resetSwapState: (zecTokenId: string | null) => void;
}

export const useSwapStore = create<SwapState>((set, get) => ({
  currentProfileAddress: null,
  tokens: [],
  originTokenId: null,
  destinationTokenId: null,
  swapAmount: '',
  refundAddress: '',
  destAddress: '',
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
        destinationTokenId: null,
        swapAmount: '',
        refundAddress: '',
        destAddress: '',
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
  setTokens: (tokens) => set({ tokens }),
  setOriginTokenId: (id) => set({ originTokenId: id }),
  setDestinationTokenId: (id) => set({ destinationTokenId: id }),
  setSwapAmount: (amount) => set({ swapAmount: amount }),
  setRefundAddress: (address) => set({ refundAddress: address }),
  setDestAddress: (address) => set({ destAddress: address }),
  setSlippageTolerance: (tolerance) => set({ slippageTolerance: tolerance }),
  setQuoteData: (data) => set({ quoteData: data }),
  setQuotePreview: (preview) => set({ quotePreview: preview }),
  setDepositUri: (uri) => set({ depositUri: uri }),
  setStatusKey: (key) => set({ statusKey: key }),
  setQuoteStatus: (status) => set({ quoteStatus: status }),
  setSwapError: (error) => set({ swapError: error }),
  swapDirection: () => {
    const { originTokenId, destinationTokenId } = get();
    set({
      originTokenId: destinationTokenId,
      destinationTokenId: originTokenId,
    });
  },
  resetQuote: () => set({ quoteData: null, quotePreview: null, quoteStatus: '' }),
  resetSwapState: (zecTokenId) =>
    set({
      originTokenId: zecTokenId,
      destinationTokenId: null,
      swapAmount: '',
      refundAddress: '',
      destAddress: '',
      slippageTolerance: '1',
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      depositUri: '',
      statusKey: null,
      swapError: '',
    }),
}));
