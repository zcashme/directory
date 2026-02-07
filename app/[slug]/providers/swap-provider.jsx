"use client";
import { createContext, useState, useRef, useEffect, useCallback } from "react";
import { getSwapTokens } from "@/lib/swap/fetchTokens";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";
import { oneclickStatus } from "@/lib/swap/oneClick";
import { getTokenId } from "@/lib/swap/swapPayload";

export const SwapContext = createContext();

export function SwapProvider({ children }) {
  // ===== STATE =====
  // Token selection
  const [tokenOptions, setTokenOptions] = useState([]);
  const [originTokenId, setOriginTokenId] = useState(null);
  const [zecTokenId, setZecTokenId] = useState(null);
  const [originSymbol, setOriginSymbol] = useState("ZEC");
  const [refundAddress, setRefundAddress] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Swap workflow
  const [swapAmount, setSwapAmount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [quoteData, setQuoteData] = useState(null);
  const [quotePreview, setQuotePreview] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("");
  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState(null);
  const [swapStatus, setSwapStatus] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [swapError, setSwapError] = useState("");

  const pollIntervalRef = useRef(null);

  // ===== COMPUTED VALUES =====
  const selectedOriginToken = tokenOptions.find((t) => getTokenId(t) === originTokenId);

  const isSwapMode = originTokenId !== null &&
                     zecTokenId !== null &&
                     originTokenId !== zecTokenId;

  // ===== FUNCTIONS =====

  // Load tokens using Server Action
  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const result = await getSwapTokens();
      if (!result.ok) {
        setSwapError(result.error || "Failed to load tokens");
        return;
      }

      const tokens = Array.isArray(result.data) ? result.data : [];

      // Filter out testnet tokens
      const mainnetTokens = tokens.filter(
        (token) =>
          token.blockchain &&
          !token.blockchain.toLowerCase().includes("testnet") &&
          !token.blockchain.toLowerCase().includes("test")
      );

      // Find ZEC token
      const zecToken = mainnetTokens.find(
        (token) =>
          (token.symbol || token.ticker || "").toUpperCase() === "ZEC" &&
          (token.blockchain || "").toLowerCase().includes("zec")
      );

      setTokenOptions(mainnetTokens);

      if (zecToken) {
        const zecId = getTokenId(zecToken);
        setZecTokenId(zecId);
        // Set initial token to ZEC if not already set
        if (!originTokenId) {
          setOriginTokenId(zecId);
          setOriginSymbol(zecToken.symbol || zecToken.ticker || "ZEC");
        }
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      setSwapError(error.message || "Failed to load tokens");
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  // Stop status polling
  const stopStatusPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll swap status
  const startStatusPolling = useCallback((key) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollStatus = async () => {
      if (!key?.depositAddress) return;

      try {
        const statusParams = { depositAddress: key.depositAddress };
        if (key.depositMemo) statusParams.depositMemo = key.depositMemo;

        const result = await oneclickStatus(statusParams);

        // Handle error response
        if (result.error) {
          // Don't stop polling on retryable errors
          return;
        }

        if (result.status) {
          // Handle different response structures:
          // - result.status (nested)
          // - result (direct status string at top level)
          const status = result.status || null;

          if (status) {
            setSwapStatus(status);

            // Update status message
            switch (status.toUpperCase()) {
              case "PENDING":
                setQuoteStatus("Waiting for deposit...");
                break;
              case "SUCCESS":
                setQuoteStatus("Swap completed! ZEC delivered to recipient.");
                stopStatusPolling();
                break;
              case "FAILED":
                setQuoteStatus("Swap failed. Please contact support.");
                setSwapError("Swap failed");
                stopStatusPolling();
                break;
              case "REFUNDED":
                setQuoteStatus("Swap refunded to your address.");
                stopStatusPolling();
                break;
              default:
                setQuoteStatus(`Status: ${status}`);
            }
          }
        }
      } catch (error) {
        console.error("Error polling swap status:", error);
      }
    };

    // Poll immediately, then every 6 seconds
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 6000);
  }, [stopStatusPolling]);

  // Get quote using Server Action
  const getQuote = useCallback(async (params) => {
    const { amountIn, destAddress, fromToken, toToken, refund, slippage } = params;

    if (!isSwapMode) return;

    setIsGettingQuote(true);
    setSwapError("");
    setQuoteStatus("Getting quote...");

    try {
      const result = await getSwapQuote({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn: amountIn,
        destAddress: destAddress,
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
  }, [
    isSwapMode,
    originTokenId,
    zecTokenId,
    refundAddress,
    slippageTolerance,
    getSwapQuote,
  ]);

  // Confirm swap using Server Action
  const confirmSwap = useCallback(async (params) => {
    const { amountIn, destAddress, fromToken, toToken, refund, slippage } = params;

    if (!isSwapMode) return;

    setIsConfirming(true);
    setSwapError("");
    setQuoteStatus("Confirming swap...");

    try {
      const result = await confirmSwapAction({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn: amountIn,
        destAddress: destAddress,
        refundAddress: refund || refundAddress,
        slippageTolerance: slippage || slippageTolerance,
      });

      if (!result.ok) {
        setSwapError(result.error || "Failed to confirm swap");
        setQuoteStatus("");
        return null;
      }

      // Store deposit URI and status key
      setDepositUri(result.paymentUri || result.deposit?.address || "");
      setStatusKey(result.statusKey);
      setQuoteData(result);
      setQuoteStatus("Swap confirmed! Waiting for deposit...");
      setSwapStatus("PENDING");

      // Start polling for status
      if (result.statusKey) {
        startStatusPolling(result.statusKey);
      }

      return result;
    } catch (error) {
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
      return null;
    } finally {
      setIsConfirming(false);
    }
  }, [
    isSwapMode,
    originTokenId,
    zecTokenId,
    refundAddress,
    slippageTolerance,
    startStatusPolling,
    confirmSwapAction,
  ]);

  // Cancel swap mode
  const cancelSwapMode = useCallback(() => {
    setOriginTokenId(zecTokenId);
    setOriginSymbol("ZEC");
    setSwapAmount("");
    setRefundAddress("");
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
    setDepositUri("");
    setStatusKey(null);
    setSwapStatus("");
    setSwapError("");
    stopStatusPolling();
  }, [zecTokenId, stopStatusPolling]);

  // Set token - entering/exiting swap mode based on token selection
  const setToken = useCallback((tokenId) => {
    // If selecting ZEC, exit swap mode by clearing all swap state
    if (tokenId === zecTokenId) {
      setOriginTokenId(zecTokenId);
      setOriginSymbol("ZEC");
      setSwapAmount("");
      setRefundAddress("");
      setQuoteData(null);
      setQuotePreview(null);
      setQuoteStatus("");
      setDepositUri("");
      setStatusKey(null);
      setSwapStatus("");
      setSwapError("");
      stopStatusPolling();
      return;
    }

    // Otherwise enter swap mode with the selected token
    const token = tokenOptions.find((t) => getTokenId(t) === tokenId);
    if (token) {
      setOriginTokenId(getTokenId(token));
      setOriginSymbol(token.symbol || token.ticker || "?");
    }
  }, [tokenOptions, zecTokenId, stopStatusPolling]);

  // ===== EFFECTS =====

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  // ===== CONTEXT VALUE =====
  const value = {
    // Token state
    tokenOptions,
    originTokenId,
    originBlockchain: selectedOriginToken?.blockchain || "",
    zecTokenId,
    originSymbol,
    isLoadingTokens,

    // Swap state
    swapAmount,
    refundAddress,
    slippageTolerance,
    quoteData,
    quotePreview,
    quoteStatus,
    depositUri,
    statusKey,
    swapStatus,
    isConfirming,
    isGettingQuote,
    swapError,

    // Computed
    isSwapMode,

    // Actions
    setToken,
    setSwapAmount,
    setRefundAddress,
    setSlippageTolerance,
    getQuote,
    confirmSwap,
    cancelSwapMode,
    loadTokens,
    startStatusPolling,
    stopStatusPolling,
  };

  return (
    <SwapContext.Provider value={value}>
      {children}
    </SwapContext.Provider>
  );
}
