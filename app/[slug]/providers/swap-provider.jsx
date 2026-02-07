"use client";
import { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { getSwapTokens } from "@/lib/swap/fetchTokens";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";
import { getTokenId } from "@/lib/swap/swapPayload";

export const SwapContext = createContext();

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

      // Find ZEC
      const zecToken = tokens.find(
        (token) =>
          (token.symbol || token.ticker || "").toUpperCase() === "ZEC" &&
          (token.blockchain || "").toLowerCase().includes("zec")
      );

      setTokenOptions(tokens);

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
      setQuoteStatus("Swap confirmed!");

      return result;
    } catch (error) {
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
      return null;
    } finally {
      setIsConfirming(false);
    }
  }, [isSwapMode, originTokenId, zecTokenId, refundAddress, slippageTolerance]);

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
  }, [zecTokenId]);

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
