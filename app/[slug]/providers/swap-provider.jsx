"use client";
import { createContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { getSwapTokens } from "@/lib/swap/fetchTokens";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";
import { oneclickStatus } from "@/lib/swap/oneClick";
import { getTokenId } from "@/lib/swap/swapPayload";

export const SwapContext = createContext();

// ===== POLLING CONFIGURATION =====
// Optimized for speed: aggressive initial polling, then backoff
const POLLING_CONFIG = {
  INITIAL_INTERVAL_MS: 1000,      // 1 second for first phase (6x faster than before)
  MAX_INITIAL_POLLS: 5,           // Do 5 aggressive polls (5 seconds total)
  BACKOFF_INTERVAL_MS: 5000,      // Then switch to 5 seconds
  MAX_RETRIES: 3,                 // Retry failed polls 3 times
  TIMEOUT_MS: 300000,             // Give up after 5 minutes
};

// Polling state machine states
const POLLING_STATES = {
  IDLE: "idle",                   // Not polling
  INITIAL: "initial",             // First 5 polls at 1s interval
  BACKOFF: "backoff",             // Then poll at 5s interval
  COMPLETE: "complete",           // Swap finished (SUCCESS/REFUNDED)
  ERROR: "error",                 // Polling failed permanently
};

export function SwapProvider({ children }) {
  // ===== INPUT STATE (User controls these) =====
  const [originTokenId, setOriginTokenIdState] = useState(null);
  const [swapAmount, setSwapAmount] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");

  // ===== TOKEN STATE (Loaded once) =====
  const [tokenOptions, setTokenOptions] = useState([]);
  const [zecTokenId, setZecTokenId] = useState(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // ===== QUOTE STATE (Output from "Get quote") =====
  const [quoteData, setQuoteData] = useState(null);
  const [quotePreview, setQuotePreview] = useState(null);

  // ===== SWAP STATE (Output from "Confirm quote") =====
  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState(null);
  const [swapStatus, setSwapStatus] = useState("");

  // ===== UI STATE (What's visible) =====
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState("");
  const [swapError, setSwapError] = useState("");

  // ===== POLLING STATE (Internal) =====
  const [pollingState, setPollingState] = useState(POLLING_STATES.IDLE);
  const pollCountRef = useRef(0);                      // Track poll count for backoff
  const pollIntervalRef = useRef(null);                // Current interval handle
  const startTimeRef = useRef(null);                   // Track polling start time
  const lastPollRef = useRef(null);                    // Deduplicate simultaneous polls
  const pollRetriesRef = useRef(0);                    // Track retries for current poll

  // ===== COMPUTED VALUES =====
  const selectedOriginToken = useMemo(
    () => tokenOptions.find((t) => getTokenId(t) === originTokenId),
    [tokenOptions, originTokenId]
  );

  const originSymbol = useMemo(
    () => selectedOriginToken?.symbol || selectedOriginToken?.ticker || "ZEC",
    [selectedOriginToken]
  );

  const isSwapMode = useMemo(
    () => originTokenId !== null && zecTokenId !== null && originTokenId !== zecTokenId,
    [originTokenId, zecTokenId]
  );

  // ===== TOKEN LOADING =====
  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const result = await getSwapTokens();
      if (!result.ok) {
        setSwapError(result.error || "Failed to load tokens");
        return;
      }

      const tokens = Array.isArray(result.data) ? result.data : [];

      // Filter mainnet only
      const mainnetTokens = tokens.filter(
        (token) =>
          token.blockchain &&
          !token.blockchain.toLowerCase().includes("testnet") &&
          !token.blockchain.toLowerCase().includes("test")
      );

      // Find ZEC
      const zecToken = mainnetTokens.find(
        (token) =>
          (token.symbol || token.ticker || "").toUpperCase() === "ZEC" &&
          (token.blockchain || "").toLowerCase().includes("zec")
      );

      setTokenOptions(mainnetTokens);

      if (zecToken) {
        const zecId = getTokenId(zecToken);
        setZecTokenId(zecId);
        if (!originTokenId) {
          setOriginTokenIdState(zecId);
        }
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      setSwapError(error.message || "Failed to load tokens");
    } finally {
      setIsLoadingTokens(false);
    }
  }, [originTokenId]);

  // ===== POLLING LOGIC (OPTIMIZED) =====

  // Stop polling immediately
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollCountRef.current = 0;
    pollRetriesRef.current = 0;
    startTimeRef.current = null;
    lastPollRef.current = null;
    setPollingState(POLLING_STATES.IDLE);
  }, []);

  // Single poll operation
  const performPoll = useCallback(async (key) => {
    // Deduplicate: don't make two requests at once
    if (lastPollRef.current) return;

    if (!key?.depositAddress) {
      stopPolling();
      return;
    }

    // Check timeout
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > POLLING_CONFIG.TIMEOUT_MS) {
        setSwapError("Swap taking too long. Please check status manually or contact support.");
        setPollingState(POLLING_STATES.ERROR);
        stopPolling();
        return;
      }
    }

    lastPollRef.current = true;
    try {
      const statusParams = { depositAddress: key.depositAddress };
      if (key.depositMemo) statusParams.depositMemo = key.depositMemo;

      const result = await oneclickStatus(statusParams);

      // Handle API error - retry
      if (result.error) {
        pollRetriesRef.current += 1;
        if (pollRetriesRef.current > POLLING_CONFIG.MAX_RETRIES) {
          console.error("Max retries exceeded:", result.error);
          setPollingState(POLLING_STATES.ERROR);
          stopPolling();
        }
        // Otherwise continue polling (will retry next interval)
        return;
      }

      // Reset retries on successful poll
      pollRetriesRef.current = 0;

      if (!result.status) {
        console.warn("No status in response", result);
        return;
      }

      const status = result.status.toUpperCase();
      setSwapStatus(status);

      // Update message and check for completion
      switch (status) {
        case "PENDING_DEPOSIT":
          setQuoteStatus("Waiting for deposit...");
          // Keep polling
          break;

        case "PROCESSING":
          setQuoteStatus("Processing swap...");
          // Keep polling
          break;

        case "SUCCESS":
          setQuoteStatus("Swap completed! ZEC delivered to recipient.");
          setPollingState(POLLING_STATES.COMPLETE);
          stopPolling();
          break;

        case "FAILED":
          setQuoteStatus("Swap failed. Please contact support.");
          setSwapError("Swap failed");
          setPollingState(POLLING_STATES.ERROR);
          stopPolling();
          break;

        case "REFUNDED":
          setQuoteStatus("Swap refunded to your address.");
          setPollingState(POLLING_STATES.COMPLETE);
          stopPolling();
          break;

        case "INCOMPLETE_DEPOSIT":
          setQuoteStatus("Deposit incomplete. Waiting for full amount...");
          // Keep polling
          break;

        default:
          setQuoteStatus(`Status: ${status}`);
      }
    } catch (error) {
      console.error("Poll error:", error);
      pollRetriesRef.current += 1;
      if (pollRetriesRef.current > POLLING_CONFIG.MAX_RETRIES) {
        setSwapError("Connection error. Please refresh and check status.");
        setPollingState(POLLING_STATES.ERROR);
        stopPolling();
      }
    } finally {
      lastPollRef.current = null;
    }
  }, [stopPolling]);

  // Start polling with adaptive intervals
  const startPolling = useCallback((key) => {
    // Clear existing polling
    stopPolling();

    if (!key?.depositAddress) return;

    // Initialize polling state
    startTimeRef.current = Date.now();
    pollCountRef.current = 0;
    pollRetriesRef.current = 0;
    setPollingState(POLLING_STATES.INITIAL);
    setQuoteStatus("Swap confirmed! Waiting for deposit...");

    // Perform first poll immediately
    performPoll(key);
    pollCountRef.current += 1;

    // Setup interval - start aggressive, then backoff
    const setupInterval = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const isInitialPhase = pollCountRef.current < POLLING_CONFIG.MAX_INITIAL_POLLS;
      const interval = isInitialPhase
        ? POLLING_CONFIG.INITIAL_INTERVAL_MS
        : POLLING_CONFIG.BACKOFF_INTERVAL_MS;

      if (isInitialPhase && pollCountRef.current === POLLING_CONFIG.MAX_INITIAL_POLLS - 1) {
        setPollingState(POLLING_STATES.BACKOFF);
      }

      pollIntervalRef.current = setInterval(() => {
        pollCountRef.current += 1;
        performPoll(key);
      }, interval);
    };

    setupInterval();
  }, [performPoll, stopPolling]);

  // ===== QUOTE ACTIONS =====

  const getQuote = useCallback(async (params) => {
    const {
      amountIn,
      destAddress,
      fromToken,
      toToken,
      refund,
      slippage,
    } = params;

    if (!isSwapMode) return;

    setIsGettingQuote(true);
    setSwapError("");
    setQuoteStatus("Getting quote...");
    setQuoteData(null);
    setQuotePreview(null);

    try {
      const result = await getSwapQuote({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn,
        destAddress,
        refundAddress: refund || refundAddress,
        slippageTolerance: slippage || slippageTolerance,
      });

      if (!result.ok) {
        setSwapError(result.error || "Failed to get quote");
        setQuoteStatus("");
        return null;
      }

      setQuotePreview(result.display);
      setQuoteData(result);
      setQuoteStatus("Quote ready");
      return result;
    } catch (error) {
      setSwapError(error.message || "Failed to get quote");
      setQuoteStatus("");
      return null;
    } finally {
      setIsGettingQuote(false);
    }
  }, [isSwapMode, originTokenId, zecTokenId, refundAddress, slippageTolerance]);

  const confirmSwap = useCallback(async (params) => {
    const {
      amountIn,
      destAddress,
      fromToken,
      toToken,
      refund,
      slippage,
    } = params;

    if (!isSwapMode) return;

    setIsConfirming(true);
    setSwapError("");
    setQuoteStatus("Confirming swap...");

    try {
      const result = await confirmSwapAction({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn,
        destAddress,
        refundAddress: refund || refundAddress,
        slippageTolerance: slippage || slippageTolerance,
      });

      if (!result.ok) {
        setSwapError(result.error || "Failed to confirm swap");
        setQuoteStatus("");
        return null;
      }

      // Store deposit and status
      setDepositUri(result.paymentUri || result.deposit?.address || "");
      setStatusKey(result.statusKey);
      setQuoteData(result);
      setSwapStatus("PENDING_DEPOSIT");

      // Start polling immediately
      if (result.statusKey) {
        startPolling(result.statusKey);
      }

      return result;
    } catch (error) {
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
      return null;
    } finally {
      setIsConfirming(false);
    }
  }, [isSwapMode, originTokenId, zecTokenId, refundAddress, slippageTolerance, startPolling]);

  // ===== SWAP MODE MANAGEMENT =====

  const setToken = useCallback((tokenId) => {
    // If selecting ZEC, exit swap mode
    if (tokenId === zecTokenId) {
      setOriginTokenIdState(zecTokenId);
      resetSwapState();
      return;
    }

    // Enter swap mode with selected token
    const token = tokenOptions.find((t) => getTokenId(t) === tokenId);
    if (token) {
      setOriginTokenIdState(getTokenId(token));
      // Clear quote but keep other state
      setQuoteData(null);
      setQuotePreview(null);
      setQuoteStatus("");
      setSwapError("");
    }
  }, [tokenOptions, zecTokenId]);

  const resetSwapState = useCallback(() => {
    setOriginTokenIdState(zecTokenId);
    setSwapAmount("");
    setRefundAddress("");
    setSlippageTolerance("0.5");
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
    setDepositUri("");
    setStatusKey(null);
    setSwapStatus("");
    setSwapError("");
    stopPolling();
  }, [zecTokenId, stopPolling]);

  // ===== QUOTE CLEARING ON INPUT CHANGE =====

  const setSwapAmountWithClear = useCallback((amount) => {
    setSwapAmount(amount);
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
  }, []);

  const setRefundAddressWithClear = useCallback((address) => {
    setRefundAddress(address);
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
  }, []);

  const setSlippageToleranceWithClear = useCallback((slippage) => {
    setSlippageTolerance(slippage);
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
  }, []);

  // ===== EFFECTS =====

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ===== CONTEXT VALUE =====
  const value = {
    // Token state
    tokenOptions,
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
    isGettingQuote,
    isConfirming,
    quoteStatus,
    swapError,
    pollingState,

    // Computed
    isSwapMode,

    // Actions
    setToken,
    setSwapAmount: setSwapAmountWithClear,
    setRefundAddress: setRefundAddressWithClear,
    setSlippageTolerance: setSlippageToleranceWithClear,
    getQuote,
    confirmSwap,
    resetSwapState,
    loadTokens,
  };

  return (
    <SwapContext.Provider value={value}>
      {children}
    </SwapContext.Provider>
  );
}
