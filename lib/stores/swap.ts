import { create } from 'zustand';
import type {
  SwapContextQuoteData,
  SwapQuoteDisplay,
} from '@/lib/swap/types';

// Polling configuration
const POLLING_CONFIG = {
  INTERVAL_MS: 5000, // Poll every 5 seconds
};

type UIStatus = "PENDING_SWAP" | "SWAP_SUCCESS" | "SWAP_FAILED";

// Map API statuses to UI states
const mapToUIState = (apiStatus: string | undefined): UIStatus => {
  const status = apiStatus?.toUpperCase();

  // Pending states
  if (status === "PENDING_DEPOSIT" || status === "PROCESSING") {
    return "PENDING_SWAP";
  }

  // Success state
  if (status === "SUCCESS") {
    return "SWAP_SUCCESS";
  }

  // Failed states
  if (status === "INCOMPLETE_DEPOSIT" || status === "REFUNDED" || status === "FAILED") {
    return "SWAP_FAILED";
  }

  return "PENDING_SWAP"; // Default to pending
};

// Get failure reason
const getFailureReason = (apiStatus: string | undefined): string | null => {
  const status = apiStatus?.toUpperCase();

  if (status === "INCOMPLETE_DEPOSIT") {
    return "Deposit was below the required amount";
  }
  if (status === "REFUNDED") {
    return "Funds were refunded to your address";
  }
  if (status === "FAILED") {
    return "Swap encountered an error";
  }

  return null;
};

export interface SwapData {
  amountInFormatted?: string;
  amountInUsd?: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  minAmountOutFormatted?: string;
  originAsset?: string;
  destinationAsset?: string;
  depositAddress?: string;
  timeEstimate?: number;
  deadline?: string;
  refundTo?: string;
  timestamp?: string;
}

/**
 * Swap state store - manages all swap-related state
 */
interface SwapState {
  originTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;
  quoteData: SwapContextQuoteData;
  quotePreview: SwapQuoteDisplay | null;
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  swapStatus: string;
  quoteStatus: string;
  swapError: string;

  // Status polling state
  isPolling: boolean;
  pollIntervalId: NodeJS.Timeout | null;
  apiStatus: string;
  uiStatus: UIStatus;
  statusMessage: string;
  failureReason: string | null;
  swapData: SwapData | null;
  statusError: string;
  isPollingInProgress: boolean;

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
  resetQuote: () => void;
  resetSwapState: (zecTokenId: string | null) => void;

  // Status polling actions
  startPolling: (depositAddress: string) => void;
  stopPolling: () => void;
  performPoll: (depositAddress: string) => Promise<void>;
  resetStatusState: () => void;
}

export const useSwapStore = create<SwapState>((set, get) => ({
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

  // Status polling state
  isPolling: false,
  pollIntervalId: null,
  apiStatus: 'PENDING_DEPOSIT',
  uiStatus: 'PENDING_SWAP',
  statusMessage: 'Checking swap status...',
  failureReason: null,
  swapData: null,
  statusError: '',
  isPollingInProgress: false,

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
      swapStatus: '',
      swapError: '',
    }),

  // Status polling actions
  startPolling: (depositAddress: string) => {
    const state = get();

    // Clear any existing interval
    if (state.pollIntervalId) {
      clearInterval(state.pollIntervalId);
    }

    // Set initial state
    set({
      isPolling: true,
      statusKey: { depositAddress },
      apiStatus: 'PENDING_DEPOSIT',
      uiStatus: 'PENDING_SWAP',
      statusMessage: 'Checking swap status...',
      failureReason: null,
      statusError: '',
    });

    // Perform first poll immediately
    get().performPoll(depositAddress);

    // Set up interval for subsequent polls
    const intervalId = setInterval(() => {
      if (get().isPolling) {
        get().performPoll(depositAddress);
      }
    }, POLLING_CONFIG.INTERVAL_MS);

    set({ pollIntervalId: intervalId });
  },

  stopPolling: () => {
    const state = get();
    if (state.pollIntervalId) {
      clearInterval(state.pollIntervalId);
    }
    set({ isPolling: false, pollIntervalId: null });
  },

  performPoll: async (depositAddress: string) => {
    const state = get();

    // Prevent concurrent polls
    if (state.isPollingInProgress) {
      return;
    }

    if (!depositAddress) {
      set({
        statusError: 'Invalid swap identifier',
        isPolling: false,
      });
      return;
    }

    set({ isPollingInProgress: true });

    try {
      const params = new URLSearchParams({ depositAddress });
      const response = await fetch(`/api/swap/status?${params.toString()}`);
      const result = await response.json();

      // Handle API error
      if (result.error) {
        set({
          statusError: 'Unable to fetch swap status. Retrying...',
          isPollingInProgress: false,
        });
        return;
      }

      // Clear error on successful poll
      set({ statusError: '' });

      if (!result.status) {
        set({ isPollingInProgress: false });
        return;
      }

      const status = result.status.toUpperCase();

      // Extract and flatten relevant data
      const swapDetails = result.swapDetails || {};
      const quoteRequest = result.quoteResponse?.quoteRequest || {};
      const quote = result.quoteResponse?.quote || {};

      const swapData: SwapData = {
        amountInFormatted: swapDetails.amountInFormatted,
        amountInUsd: swapDetails.amountInUsd,
        amountOutFormatted: swapDetails.amountOutFormatted,
        amountOutUsd: swapDetails.amountOutUsd,
        minAmountOutFormatted: quote.amountOutFormatted,
        originAsset: quoteRequest.originAsset,
        destinationAsset: quoteRequest.destinationAsset,
        depositAddress: quote.depositAddress,
        timeEstimate: quote.timeEstimate,
        deadline: quote.deadline,
        refundTo: quoteRequest.refundTo,
        timestamp: result.updatedAt,
      };

      // Map to UI state and handle accordingly
      const mappedStatus = mapToUIState(status);
      let statusMessage = '';
      let failureReason: string | null = null;
      let shouldStopPolling = false;

      switch (mappedStatus) {
        case "PENDING_SWAP":
          statusMessage = "Your swap is pending. This usually takes a few minutes.";
          break;
        case "SWAP_SUCCESS":
          statusMessage = "Swap completed successfully!";
          shouldStopPolling = true;
          break;
        case "SWAP_FAILED":
          statusMessage = "Swap failed.";
          failureReason = getFailureReason(status);
          shouldStopPolling = true;
          break;
        default:
          statusMessage = "Checking swap status...";
      }

      set({
        apiStatus: status,
        uiStatus: mappedStatus,
        statusMessage,
        failureReason,
        swapData,
        isPollingInProgress: false,
      });

      // Stop polling if terminal state reached
      if (shouldStopPolling) {
        get().stopPolling();
      }
    } catch (_err) {
      set({
        statusError: 'Connection error. Retrying...',
        isPollingInProgress: false,
      });
    }
  },

  resetStatusState: () => {
    const state = get();
    if (state.pollIntervalId) {
      clearInterval(state.pollIntervalId);
    }
    set({
      statusKey: null,
      isPolling: false,
      pollIntervalId: null,
      apiStatus: 'PENDING_DEPOSIT',
      uiStatus: 'PENDING_SWAP',
      statusMessage: 'Checking swap status...',
      failureReason: null,
      swapData: null,
      statusError: '',
      isPollingInProgress: false,
    });
  },
}));
