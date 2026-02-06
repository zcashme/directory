"use client";
import { createContext, useState, useRef, useEffect, useCallback } from "react";
import { getSwapTokens } from "@/lib/swap/tokensAction";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";
import { getSwapStatus } from "@/lib/swap/statusAction";

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
        throw new Error(result.error || "Failed to load tokens");
      }

      const tokens = result.data?.tokens || result.data || [];

      // Filter out testnet tokens (API uses 'blockchain' property, not 'chain')
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
        setZecTokenId(zecToken.id || zecToken.assetId);
        // Set initial token to ZEC if not already set
        if (!originTokenId) {
          setOriginTokenId(zecToken.id || zecToken.assetId);
          setOriginSymbol(zecToken.symbol || zecToken.ticker || "ZEC");
        }
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [originTokenId, getSwapTokens]);

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
        const result = await getSwapStatus({
          depositAddress: key.depositAddress,
          depositMemo: key.depositMemo,
        });

        if (result.ok && result.status) {
          // Handle different response structures:
          // - result.status.status (nested)
          // - result.status (direct status string)
          const status = result.status?.status || result.status || null;

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
        } else if (result.ok === false && result.error) {
          // Handle API errors gracefully
          console.error("Swap status error:", result.error);
          // Don't stop polling on retryable errors
          if (!result.retryable) {
            setSwapError(result.error);
            stopStatusPolling();
          }
        }
      } catch (error) {
        console.error("Error polling swap status:", error);
      }
    };

    // Poll immediately, then every 6 seconds
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 6000);
  }, [stopStatusPolling, getSwapStatus]);

  // Get quote using Server Action
  const getQuote = useCallback(async (params) => {
    const { amount, destAddress, fromToken, toToken, refund, slippage } = params;

    if (!isSwapMode) return;

    setIsGettingQuote(true);
    setSwapError("");
    setQuoteStatus("Getting quote...");

    try {
      const result = await getSwapQuote({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn: amount,
        destAddress: destAddress,
        refundAddress: refund || refundAddress,
        slippageTolerance: slippage || slippageTolerance,
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to get quote");
      }

      setQuotePreview(result.display);
      setQuoteData(result);
      setQuoteStatus("Quote ready");
      return result;
    } catch (error) {
      console.error("Error getting quote:", error);
      setSwapError(error.message || "Failed to get quote");
      setQuoteStatus("");
      throw error;
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
    const { amount, destAddress, fromToken, toToken, refund, slippage } = params;

    if (!isSwapMode) return;

    setIsConfirming(true);
    setSwapError("");
    setQuoteStatus("Confirming swap...");

    try {
      const result = await confirmSwapAction({
        fromToken: fromToken || originTokenId,
        toToken: toToken || zecTokenId,
        amountIn: amount,
        destAddress: destAddress,
        refundAddress: refund || refundAddress,
        slippageTolerance: slippage || slippageTolerance,
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to confirm swap");
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
      console.error("Error confirming swap:", error);
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
      throw error;
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

  // Set token
  const setToken = useCallback((tokenId) => {
    const token = tokenOptions.find((t) => {
      const tId = t.id || t.assetId || t.tokenId || t.asset;
      return tId === tokenId;
    });
    if (token) {
      const finalTokenId = token.id || token.assetId || token.tokenId || token.asset || tokenId;
      setOriginTokenId(finalTokenId);
      setOriginSymbol(token.symbol || token.ticker || "ZEC");
    }
  }, [tokenOptions]);

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
    zecTokenId,
    originSymbol,
    isLoadingTokens,

    // Swap state
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
