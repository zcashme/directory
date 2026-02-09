import { create } from 'zustand';
import type {
  SwapContextQuoteData,
  SwapQuoteDisplay,
} from '@/lib/swap/types';

const POLL_INTERVAL = 5000;

export interface SwapStatusData {
  status: string;
  swapDetails?: {
    amountInFormatted?: string;
    amountInUsd?: string;
    amountOutFormatted?: string;
    amountOutUsd?: string;
  };
  quoteResponse?: {
    quoteRequest?: {
      originAsset?: string;
      destinationAsset?: string;
      refundTo?: string;
    };
    quote?: {
      amountOutFormatted?: string;
      depositAddress?: string;
      timeEstimate?: number;
      deadline?: string;
    };
  };
  updatedAt?: string;
}

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

  // Status polling
  statusData: SwapStatusData | null;
  statusError: string;
  pollInterval: NodeJS.Timeout | null;

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

  // Status polling
  startPolling: (depositAddress: string) => void;
  stopPolling: () => void;
}

const poll = async (depositAddress: string, set: (state: Partial<SwapState>) => void, get: () => SwapState) => {
  try {
    const response = await fetch(`/api/swap/status?${new URLSearchParams({ depositAddress })}`);
    const data = await response.json();

    if (data.error) {
      set({ statusError: 'Unable to fetch status' });
      return;
    }

    set({ statusData: data, statusError: '' });

    // Stop polling on terminal states
    if (['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(data.status?.toUpperCase())) {
      get().stopPolling();
    }
  } catch {
    set({ statusError: 'Connection error' });
  }
};

export const useSwapStore = create<SwapState>((set, get) => ({
  currentProfileAddress: null,
  originTokenId: null,
  swapAmount: '',
  refundAddress: '',
  slippageTolerance: '0.5',
  quoteData: null,
  quotePreview: null,
  depositUri: '',
  statusKey: null,
  quoteStatus: '',
  swapError: '',
  statusData: null,
  statusError: '',
  pollInterval: null,

  ensureProfile: (address, zecTokenId) => {
    if (get().currentProfileAddress !== address) {
      get().stopPolling();
      set({
        currentProfileAddress: address,
        originTokenId: zecTokenId,
        swapAmount: '',
        refundAddress: '',
        slippageTolerance: '0.5',
        quoteData: null,
        quotePreview: null,
        quoteStatus: '',
        depositUri: '',
        statusKey: null,
        swapError: '',
        statusData: null,
        statusError: '',
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
      slippageTolerance: '0.5',
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      depositUri: '',
      statusKey: null,
      swapError: '',
    }),

  startPolling: (depositAddress) => {
    get().stopPolling();
    set({ statusKey: { depositAddress }, statusError: '' });
    poll(depositAddress, set, get);
    const interval = setInterval(() => poll(depositAddress, set, get), POLL_INTERVAL);
    set({ pollInterval: interval });
  },

  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) clearInterval(pollInterval);
    set({ pollInterval: null });
  },
}));
