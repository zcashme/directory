"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { validate as validateMultichainAddress } from "multichain-address-validator";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
import { getZcashAddressHint, validateZcashAddress } from "@/ui/signup/zcashAddress";
import SwapQuoteDisplay from "@/ui/swap/SwapQuoteDisplay";
import SwapDepositDisplay from "@/ui/swap/SwapDepositDisplay";
import SwapSlippageControl from "@/ui/swap/SwapSlippageControl";
import {
  getSwapQuote,
  confirmSwap,
  getSwapStatus,
} from "@/lib/swap/oneClick";
import { parseTokenSymbol } from "@/lib/swap/utils";
import SwapCurrencyPair, { TokenIcon } from "@/ui/swap/SwapCurrencyPair";
import type {
  Token,
  SwapQuoteDisplay as SwapQuoteDisplayType,
} from "@/lib/swap/types";

const STATUS_CONFIG = {
  SUCCESS: { color: "bg-green-100 text-green-700", label: "Success" },
  FAILED: { color: "bg-red-100 text-red-700", label: "Failed" },
  REFUNDED: { color: "bg-red-100 text-red-700", label: "Refunded" },
  INCOMPLETE_DEPOSIT: { color: "bg-red-100 text-red-700", label: "Incomplete" },
  PROCESSING: { color: "bg-[var(--color-brand-blue)]/15 text-[var(--color-brand-blue)]", label: "Processing" },
  PENDING_DEPOSIT: { color: "bg-[var(--color-brand-blue)]/15 text-[var(--color-brand-blue)]", label: "Pending" },
} as const;

const getTokenKey = (token: Token | null | undefined): string =>
  token?.id || token?.assetId || token?.symbol || "";

function toProperCaseLabel(value: string): string {
  return value
    .replace(/[_./-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getBaseLayerLabel(blockchain?: string): string {
  const chain = (blockchain ?? "").trim().toLowerCase();
  if (!chain) return "";
  if (chain.includes("zec") || chain.includes("zcash")) return "Zcash";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "Bitcoin";
  if (chain.includes("eth") || chain.includes("ethereum")) return "Ethereum";
  if (chain.includes("sol") || chain.includes("solana")) return "Solana";
  if (chain.includes("tron")) return "Tron";
  if (chain.includes("stellar") || chain.includes("xlm")) return "Stellar";
  if (chain.includes("ripple") || chain.includes("xrp")) return "Ripple";
  return blockchain ? toProperCaseLabel(blockchain) : "";
}

function resolveValidationChain(assetSymbol: string, chainHint: string): string {
  const symbol = assetSymbol.toLowerCase();
  const chain = chainHint.toLowerCase().trim();

  // Prefer chain/base-layer hints from the selected token over symbol fallbacks.
  if (chain.includes("zec") || chain.includes("zcash")) return "zec";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "bitcoin";
  if (chain.includes("eth") || chain.includes("ethereum")) return "ethereum";
  if (chain.includes("sol") || chain.includes("solana")) return "solana";
  if (chain.includes("tron") || chain.includes("trc")) return "tron";
  if (chain.includes("stellar") || chain.includes("xlm")) return "stellar";
  if (chain.includes("ripple") || chain.includes("xrp")) return "ripple";
  if (
    chain.includes("arb") ||
    chain.includes("base") ||
    chain.includes("optimism") ||
    chain.includes("avalanche") ||
    chain.includes("bsc") ||
    chain.includes("binance")
  ) {
    return "ethereum";
  }

  if (symbol === "btc") return "bitcoin";
  if (symbol === "eth") return "ethereum";
  if (symbol === "sol") return "solana";
  if (symbol === "zec") return "zec";
  if (symbol === "xrp") return "ripple";
  if (symbol === "xlm") return "stellar";
  if (symbol === "usdc" || symbol === "usdt") return "ethereum";

  return symbol;
}

function validateAddressForToken(
  address: string,
  token: Token | null,
  addressType: "refund" | "destination",
): {
  isValid: boolean;
  message: string;
  state: "valid" | "invalid" | "warning" | "none";
} {
  const trimmedAddress = address.trim();
  if (!token || !trimmedAddress) {
    return {
      isValid: false,
      message: "",
      state: "none",
    };
  }

  try {
    const symbol = token.symbol.toLowerCase();
    const chain = resolveValidationChain(token.symbol, token.blockchain ?? "");
    const baseLayer = getBaseLayerLabel(token.blockchain) || token.symbol;
    const context = addressType === "refund" ? "refund" : "recipient";

    if (symbol === "zec") {
      const zecValidation = validateZcashAddress(trimmedAddress);
      const isTransparentType =
        zecValidation.type === "tex" || zecValidation.type === "transparent";
      const isValid = zecValidation.valid;
      const context = addressType === "refund" ? "refund" : "recipient";

      return {
        isValid,
        message: isValid
          ? isTransparentType
            ? `${token.symbol} ${context} address looks valid. Careful, this is a transparent address. Consider using a shielded address instead (u1...).`
            : `${token.symbol} ${context} address looks valid.`
          : getZcashAddressHint(trimmedAddress),
        state: isValid ? (isTransparentType ? "warning" : "valid") : "invalid",
      };
    }

    const isValid = validateMultichainAddress(trimmedAddress, chain);

    return {
      isValid,
      message: isValid
        ? `${token.symbol} ${context} address looks valid.`
        : `${baseLayer} ${context} address is not valid.`,
      state: isValid ? "valid" : "invalid",
    };
  } catch {
    const baseLayer = getBaseLayerLabel(token.blockchain) || token.symbol;
    const context = addressType === "refund" ? "refund" : "recipient";
    return {
      isValid: false,
      message: `${baseLayer} ${context} address is not valid.`,
      state: "invalid",
    };
  }
}

function SwapStatusDisplay({
  initialDepositAddress,
}: {
  initialDepositAddress: string;
}) {
  const [depositAddress, setDepositAddress] = useState(initialDepositAddress);
  const [inputValue, setInputValue] = useState(initialDepositAddress);
  const [showInput, setShowInput] = useState(!initialDepositAddress);
  const [detailsOpen, setDetailsOpen] = useState(!!initialDepositAddress);

  // Keep local state in sync when a new tracked deposit address is passed in.
  useEffect(() => {
    const nextAddress = (initialDepositAddress ?? "").trim();
    if (!nextAddress) return;

    setInputValue(nextAddress);
    setDepositAddress(nextAddress);
    setShowInput(false);
    setDetailsOpen(true);
  }, [initialDepositAddress]);

  // Poll swap status every 5 seconds
  const { data: statusResult, error } = useQuery({
    queryKey: ["swapStatus", depositAddress],
    queryFn: () => getSwapStatus(depositAddress),
    enabled: !!depositAddress && !showInput,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !data.ok) return 5000;

      const status = data.data.status?.toUpperCase();
      const isTerminal = [
        "SUCCESS",
        "FAILED",
        "REFUNDED",
        "INCOMPLETE_DEPOSIT",
      ].includes(status || "");

      // Stop polling if terminal state reached
      return isTerminal ? false : 5000;
    },
  });

  const statusData = statusResult?.ok ? statusResult.data : null;
  const statusError =
    statusResult && !statusResult.ok
      ? statusResult.error
      : error?.message || "";

  const status = statusData?.status?.toUpperCase() || "PENDING_DEPOSIT";
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.PENDING_DEPOSIT;
  const isPolling = ![
    "SUCCESS",
    "FAILED",
    "REFUNDED",
    "INCOMPLETE_DEPOSIT",
  ].includes(status);
  const activityLabel =
    status === "PENDING_DEPOSIT"
      ? "Receiving"
      : status === "PROCESSING"
        ? "Swapping"
        : "Updating";
  const details = statusData?.swapDetails;
  const quote = statusData?.quoteResponse?.quote;
  const request = statusData?.quoteResponse?.quoteRequest;

  const fromSymbol = parseTokenSymbol(request?.originAsset) || "";
  const toSymbol = parseTokenSymbol(request?.destinationAsset) || "";

  const handleCheckSwap = () => {
    if (inputValue.trim()) {
      setDepositAddress(inputValue.trim());
      setShowInput(false);
      setDetailsOpen(true);
    }
  };
  const statusHeader = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Swap Status</h2>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${config.color}`}
        >
          {config.label}
        </span>
      </div>
      {isPolling && (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5" aria-hidden="true">
            {[0, 0.1, 0.2].map((delay, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">{activityLabel}</span>
        </div>
      )}
    </div>
  );

  // Show input form when no deposit address is being tracked
  if (showInput) {
    return (
      <div className="space-y-6">
        {statusHeader}
        <p className="text-sm text-gray-600">
          Enter the deposit address from your swap to check its status.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Deposit Address
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter deposit address..."
            className="w-full px-4 py-3 rounded-xl border border-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            style={{ backgroundColor: "var(--color-background)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheckSwap();
            }}
          />
        </div>

        <button
          onClick={handleCheckSwap}
          disabled={!inputValue.trim()}
          className={`w-full px-4 py-3 rounded-xl font-semibold ${
            inputValue.trim()
              ? "border border-gray-800 hover:bg-gray-50"
              : "bg-gray-100 text-gray-400 border border-gray-300"
          }`}
        >
          Check Swap
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statusHeader}
      <div className="flex flex-col gap-4">
        {fromSymbol && toSymbol && (
          <div className="flex justify-center py-4">
            <SwapCurrencyPair
              fromSymbol={fromSymbol}
              toSymbol={toSymbol}
              size="lg"
              showLabel={false}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Sent</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={fromSymbol || ""} size={24} />
            <p className="text-lg font-semibold">
              {details?.amountInFormatted || `— ${fromSymbol}`}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            {details?.amountInUsd ? `$${details.amountInUsd}` : "$—"}
          </p>
        </div>

        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Received</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={toSymbol || ""} size={24} />
            <p className="text-lg font-semibold">
              {details?.amountOutFormatted || `— ${toSymbol}`}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            {details?.amountOutUsd ? `$${details.amountOutUsd}` : "$—"}
          </p>
        </div>
      </div>

      <div className="border border-gray-800 rounded-xl overflow-hidden transition-colors hover:border-[var(--color-brand-blue)]">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full px-4 py-3 flex justify-between items-center font-semibold transition-colors hover:text-[var(--color-brand-blue)]"
        >
          <span>Swap Details</span>
          <span
            className={`transform transition ${detailsOpen ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        {detailsOpen && (
          <div className="border-t border-gray-800 px-4 py-3 space-y-3 text-sm">
            {[
              {
                label: "Origin Asset",
                value: request?.originAsset
                  ? parseTokenSymbol(request.originAsset)
                  : null,
              },
              {
                label: "Recipient Asset",
                value: request?.destinationAsset
                  ? parseTokenSymbol(request.destinationAsset)
                  : null,
              },
              { label: "Deposit Address", value: depositAddress, mono: true },
              {
                label: "Refund Address",
                value: request?.refundTo,
                mono: true,
              },
              {
                label: "Deadline",
                value:
                  quote?.deadline && new Date(quote.deadline).toLocaleString(),
              },
              {
                label: "Updated",
                value:
                  statusData?.updatedAt &&
                  new Date(statusData.updatedAt).toLocaleString(),
              },
            ].map(({ label, value, mono }, i) =>
              value ? (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-gray-600">{label}</span>
                  <span
                    className={`text-xs text-right ${
                      mono ? "font-mono break-all max-w-xs" : ""
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      {statusError && (
        <div
          className="text-gray-900 text-sm border border-gray-800 rounded-xl p-3"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          {statusError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setInputValue("");
            setShowInput(true);
          }}
          className="flex-1 bg-transparent border border-gray-800 px-4 py-2 rounded-xl font-semibold transition-colors hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]"
        >
          Check Another
        </button>
        <button
          onClick={async () => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?depositAddress=${depositAddress}`;
            if (navigator.share) {
              try {
                await navigator.share({
                  title: "Swap Status",
                  text: "Check out this swap status:",
                  url: shareUrl,
                });
                return;
              } catch {
                // User cancelled or failed - fall through to clipboard
              }
            }
            await navigator.clipboard.writeText(shareUrl);
            alert("Link copied to clipboard!");
          }}
          className="flex-1 bg-transparent border border-gray-800 px-4 py-2 rounded-xl font-semibold transition-colors hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]"
        >
          Share
        </button>
      </div>
    </div>
  );
}

export default function SwapAppClient({
  initialDepositAddress,
  initialTokens,
}: {
  initialDepositAddress: string | null;
  initialTokens: Token[];
}) {
  const flipCardRootRef = useRef<HTMLDivElement | null>(null);
  const depositSectionRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledDepositAddressRef = useRef("");
  const [isStatus, setIsStatus] = useState(!!initialDepositAddress);
  const [trackingDepositAddress, setTrackingDepositAddress] = useState<string>(
    initialDepositAddress || "",
  );

  const tokens = initialTokens;
  const defaultToToken = useMemo(() => {
    if (tokens.length === 0) return null;

    const nativeZecToken = tokens.find(
      (token) =>
        token.symbol.toUpperCase() === "ZEC" &&
        token.blockchain.toLowerCase().includes("zec"),
    );
    const anyZecToken = tokens.find(
      (token) => token.symbol.toUpperCase() === "ZEC",
    );
    return nativeZecToken ?? anyZecToken ?? tokens[1] ?? tokens[0] ?? null;
  }, [tokens]);
  const defaultFromToken = useMemo(() => {
    if (tokens.length === 0) return null;
    return (
      tokens.find((token) => getTokenKey(token) !== getTokenKey(defaultToToken)) ??
      tokens[0] ??
      null
    );
  }, [tokens, defaultToToken]);

  // Swap form state
  const [fromToken, setFromToken] = useState<Token | null>(defaultFromToken);
  const [toToken, setToToken] = useState<Token | null>(defaultToToken);
  const [fromAmount, setFromAmount] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [refundTouched, setRefundTouched] = useState(false);
  const [destTouched, setDestTouched] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState("2");

  // Quote state
  const [quote, setQuote] = useState<SwapQuoteDisplayType | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Deposit state (after confirmation)
  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState<{ depositAddress: string } | null>(
    null,
  );
  const [depositAmountDecimal, setDepositAmountDecimal] = useState("");
  const autoQuoteKeyRef = useRef("");
  const autoConfirmKeyRef = useRef("");

  // Load tracking deposit address from localStorage on mount
  useEffect(() => {
    if (!initialDepositAddress) {
      const stored = localStorage.getItem("swapTrackingDepositAddress");
      if (stored) {
        setTrackingDepositAddress(stored);
      }
    }
  }, [initialDepositAddress]);

  // Save tracking deposit address to localStorage when it changes
  useEffect(() => {
    if (trackingDepositAddress) {
      localStorage.setItem(
        "swapTrackingDepositAddress",
        trackingDepositAddress,
      );
    }
  }, [trackingDepositAddress]);

  const scrollToAbsoluteTop = useCallback(() => {
    // Scroll any scrollable parent containers that may wrap this card.
    const seen = new Set<HTMLElement>();
    let node: HTMLElement | null = flipCardRootRef.current;
    while (node && !seen.has(node)) {
      seen.add(node);
      const style = window.getComputedStyle(node);
      const canScrollY =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight;
      if (canScrollY) {
        node.scrollTop = 0;
      }
      node = node.parentElement;
    }

    // Scroll page-level containers.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (!isStatus) return;
    const scrollOnce = () => {
      scrollToAbsoluteTop();
    };

    scrollOnce();
    const raf = window.requestAnimationFrame(scrollOnce);
    const t1 = window.setTimeout(scrollOnce, 80);
    const t2 = window.setTimeout(scrollOnce, 220);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isStatus, scrollToAbsoluteTop]);

  const scrollToDepositSection = useCallback(() => {
    const section = depositSectionRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  }, []);

  useEffect(() => {
    const currentAddress = statusKey?.depositAddress ?? "";
    if (!currentAddress) {
      lastScrolledDepositAddressRef.current = "";
      return;
    }
    if (isStatus) return;
    if (lastScrolledDepositAddressRef.current === currentAddress) return;
    lastScrolledDepositAddressRef.current = currentAddress;

    const run = () => {
      scrollToDepositSection();
    };

    run();
    const raf = window.requestAnimationFrame(run);
    const t1 = window.setTimeout(run, 120);
    const t2 = window.setTimeout(run, 280);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [statusKey?.depositAddress, isStatus, scrollToDepositSection]);

  const resetSwapProgress = useCallback(() => {
    setQuote(null);
    setQuoteError(null);
    setDepositUri("");
    setStatusKey(null);
    setDepositAmountDecimal("");
    autoQuoteKeyRef.current = "";
    autoConfirmKeyRef.current = "";
  }, []);

  const hasFromAmount = Number.parseFloat(fromAmount) > 0;
  const refundValidation = useMemo(
    () => validateAddressForToken(refundAddress, fromToken, "refund"),
    [refundAddress, fromToken],
  );
  const destinationValidation = useMemo(
    () => validateAddressForToken(destAddress, toToken, "destination"),
    [destAddress, toToken],
  );
  const canExecuteSwapFlow =
    hasFromAmount &&
    refundValidation.isValid &&
    destinationValidation.isValid &&
    !!fromToken &&
    !!toToken;

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !canExecuteSwapFlow) return;

    const currentQuoteKey = [
      getTokenKey(fromToken),
      getTokenKey(toToken),
      fromAmount,
      refundAddress.trim(),
      destAddress.trim(),
      slippageTolerance,
    ].join("|");
    autoQuoteKeyRef.current = currentQuoteKey;

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const result = await getSwapQuote({
        fromToken: fromToken.assetId || fromToken.symbol,
        toToken: toToken.assetId || toToken.symbol,
        amountIn: fromAmount,
        destAddress,
        refundAddress,
        slippageTolerance,
        tokens,
      });

      if (result.ok) {
        setQuote(result.data.display);
      } else {
        setQuote(null);
        setQuoteError(result.error);
      }
    } catch {
      setQuote(null);
      setQuoteError("Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [
    fromToken,
    toToken,
    canExecuteSwapFlow,
    fromAmount,
    destAddress,
    refundAddress,
    slippageTolerance,
    tokens,
  ]);

  const confirmQuote = useCallback(async () => {
    if (!quote || !fromToken || !toToken || !canExecuteSwapFlow) return;

    const currentConfirmKey = [
      getTokenKey(fromToken),
      getTokenKey(toToken),
      fromAmount,
      refundAddress.trim(),
      destAddress.trim(),
      slippageTolerance,
      quote.amountOutFormatted || "",
      quote.timeEstimate || "",
    ].join("|");
    autoConfirmKeyRef.current = currentConfirmKey;

    setConfirmLoading(true);
    setQuoteError(null);

    try {
      const result = await confirmSwap({
        fromToken: fromToken.assetId || fromToken.symbol,
        toToken: toToken.assetId || toToken.symbol,
        amountIn: fromAmount,
        destAddress,
        refundAddress,
        slippageTolerance,
        tokens,
      });

      if (result.ok) {
        setDepositUri(result.data.paymentUri);
        setStatusKey(result.data.statusKey);
        setDepositAmountDecimal(result.data.deposit?.amountDecimal ?? "");
      } else {
        setQuoteError(result.error);
      }
    } catch {
      setQuoteError("Failed to confirm quote");
    } finally {
      setConfirmLoading(false);
    }
  }, [
    quote,
    fromToken,
    toToken,
    canExecuteSwapFlow,
    fromAmount,
    destAddress,
    refundAddress,
    slippageTolerance,
    tokens,
  ]);

  const handleFromTokenChange = (tokenId: string) => {
    const token = tokens.find(
      (t) => (t.id || t.assetId || t.symbol) === tokenId,
    );
    if (token) {
      setFromToken(token);
      resetSwapProgress();
    }
  };

  const handleToTokenChange = (tokenId: string) => {
    const token = tokens.find(
      (t) => (t.id || t.assetId || t.symbol) === tokenId,
    );
    if (token) {
      setToToken(token);
      resetSwapProgress();
    }
  };

  const handleFromAmountChange = (amount: string) => {
    setFromAmount(amount);
    resetSwapProgress();
  };

  const handleRefundAddressChange = (value: string) => {
    setRefundAddress(value);
    resetSwapProgress();
  };

  const handleDestinationAddressChange = (value: string) => {
    setDestAddress(value);
    resetSwapProgress();
  };

  const handleSlippageChange = (value: string) => {
    if (value === slippageTolerance) return;
    setSlippageTolerance(value);
    resetSwapProgress();
  };

  const handleSentFunds = () => {
    if (statusKey?.depositAddress) {
      setTrackingDepositAddress(statusKey.depositAddress);
      setIsStatus(true);
    }
  };

  useEffect(() => {
    const canAutoQuote =
      canExecuteSwapFlow &&
      !statusKey?.depositAddress;

    if (!canAutoQuote) {
      autoQuoteKeyRef.current = "";
      return;
    }

    const nextQuoteKey = [
      getTokenKey(fromToken),
      getTokenKey(toToken),
      fromAmount,
      refundAddress.trim(),
      destAddress.trim(),
      slippageTolerance,
    ].join("|");

    if (
      autoQuoteKeyRef.current === nextQuoteKey ||
      quoteLoading ||
      confirmLoading
    ) {
      return;
    }
    autoQuoteKeyRef.current = nextQuoteKey;

    void fetchQuote();
  }, [
    canExecuteSwapFlow,
    quoteLoading,
    confirmLoading,
    statusKey?.depositAddress,
    fromToken,
    toToken,
    fromAmount,
    refundAddress,
    destAddress,
    slippageTolerance,
    fetchQuote,
  ]);

  useEffect(() => {
    const canAutoConfirm =
      !!quote &&
      canExecuteSwapFlow &&
      !quoteLoading &&
      !confirmLoading &&
      !statusKey?.depositAddress;

    if (!canAutoConfirm) {
      if (!quote) autoConfirmKeyRef.current = "";
      return;
    }

    const nextConfirmKey = [
      getTokenKey(fromToken),
      getTokenKey(toToken),
      fromAmount,
      refundAddress.trim(),
      destAddress.trim(),
      slippageTolerance,
      quote?.amountOutFormatted || "",
      quote?.timeEstimate || "",
    ].join("|");

    if (autoConfirmKeyRef.current === nextConfirmKey) return;
    autoConfirmKeyRef.current = nextConfirmKey;

    void confirmQuote();
  }, [
    quote,
    canExecuteSwapFlow,
    quoteLoading,
    confirmLoading,
    statusKey?.depositAddress,
    fromToken,
    toToken,
    fromAmount,
    refundAddress,
    destAddress,
    slippageTolerance,
    confirmQuote,
  ]);

  // Format tokens for AmountAndWallet
  const formattedTokens = tokens.map((token) => ({
    id: token.id || token.assetId || token.symbol,
    symbol: token.symbol,
    chain: token.blockchain,
    logo: token.logo || "",
  }));
  const showRefundAddressInput = hasFromAmount;
  const showDestinationAddressInput = hasFromAmount;
  const showRefundValidation =
    showRefundAddressInput && (refundTouched || refundAddress.trim().length > 0);
  const showDestinationValidation =
    showDestinationAddressInput && (destTouched || destAddress.trim().length > 0);
  const fromBaseLayerLabel =
    getBaseLayerLabel(fromToken?.blockchain) || fromToken?.blockchain || "";
  const toBaseLayerLabel =
    getBaseLayerLabel(toToken?.blockchain) || toToken?.blockchain || "";
  const refundAddressLabel: ReactNode = fromBaseLayerLabel
    ? `${fromBaseLayerLabel} Refund Address`
    : "Refund Address";
  const destinationAddressLabel: ReactNode = toBaseLayerLabel
    ? `${toBaseLayerLabel} Recipient Address`
    : "Recipient Address";
  const showFlowPanel =
    quoteLoading || confirmLoading || !!quote || !!statusKey?.depositAddress || !!quoteError;
  const toTokenBaseLabel = getBaseLayerLabel(toToken?.blockchain) || toToken?.blockchain || "";
  const toTokenDisplayLabel = toToken
    ? toTokenBaseLabel
      ? `${toToken.symbol} on ${toTokenBaseLabel}`
      : toToken.symbol
    : "";
  const collapseFromFiatPillSignal =
    confirmLoading || !!statusKey?.depositAddress
      ? `${confirmLoading ? "confirming" : "deposit"}:${statusKey?.depositAddress ?? ""}`
      : undefined;
  const fromTokenTickerLabel = fromToken?.symbol || "";
  const toTokenTickerLabel = toToken?.symbol || "";

  const getAddressPlaceholder = (
    token: Token | null,
    emptyFallback: string,
    useBaseLayerOnly = false,
  ) => {
    if (!token) return emptyFallback;

    const baseLayer = getBaseLayerLabel(token.blockchain);
    if (useBaseLayerOnly && baseLayer) {
      return `${baseLayer} address...`;
    }

    const displaySymbol = baseLayer ? `${token.symbol} (${baseLayer})` : token.symbol;

    return `${displaySymbol} address...`;
  };
  const broughtByNear = (
    <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
      <span>Brought to you by</span>
      <img
        src="https://upload.wikimedia.org/wikipedia/fr/thumb/c/c0/Logo_Near_protocol.png/960px-Logo_Near_protocol.png?_=20231215095140"
        alt="NEAR Protocol"
        className="h-5 w-auto object-contain"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );

  return (
    <>
      {!isStatus && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {broughtByNear}
          <button
            type="button"
            onClick={() => setIsStatus(true)}
            className="bg-transparent px-3 py-1.5 text-sm font-semibold text-gray-900 border border-gray-800 rounded-lg transition-colors hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]"
          >
            Check Status of Swap
          </button>
        </div>
      )}
      {isStatus && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsStatus(false)}
            className="bg-transparent px-3 py-1.5 text-sm font-semibold text-gray-700 border border-gray-800 rounded-lg transition-colors hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]"
          >
            Back to Swap
          </button>
          {broughtByNear}
        </div>
      )}

      {/* Flip Card Container */}
      <div
        ref={flipCardRootRef}
        className="relative overflow-visible"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative w-full transition-transform duration-300 overflow-visible"
          style={{
            transformStyle: "preserve-3d",
            transform: isStatus ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Side - Main Swap Card */}
          <div
            className={`rounded-3xl border border-gray-800 p-4 md:p-6 shadow-lg overflow-visible ${
              isStatus ? "absolute top-0 left-0 w-full" : "relative"
            }`}
            style={{
              backgroundColor: "var(--color-background)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Currency Swap Section */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-3 items-stretch">
                {/* From Section */}
                <div className="flex-1">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      From{" "}
                      {fromTokenTickerLabel && fromBaseLayerLabel && (
                        <span>
                          {fromTokenTickerLabel} on {fromBaseLayerLabel}
                        </span>
                      )}
                    </label>
                    <AmountAndWallet
                      amount={fromAmount}
                      setAmount={handleFromAmountChange}
                      showUsdPill={true}
                      collapseUsdPillSignal={collapseFromFiatPillSignal}
                      showOpenWallet={false}
                      asset={fromToken ? getTokenKey(fromToken) : ""}
                      assetDisplayLabel={fromTokenTickerLabel}
                      assetOptions={formattedTokens}
                      setAsset={handleFromTokenChange}
                      filterAllowedBaseLayers={false}
                    />
                  </div>
                </div>
                {showRefundAddressInput && (
                  <div className="md:hidden">
                    <SwapAddressInput
                      label={refundAddressLabel}
                      value={refundAddress}
                      onChange={handleRefundAddressChange}
                      onBlur={() => setRefundTouched(true)}
                      placeholder={getAddressPlaceholder(fromToken, "Select from token first", true)}
                      disabled={!fromToken}
                      validationMessage={refundValidation.message}
                      validationState={refundValidation.state}
                      showValidation={showRefundValidation}
                    />
                  </div>
                )}

                {/* To Section */}
                <div className="flex-1">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      To
                    </label>
                    <AmountAndWallet
                      amount={toTokenDisplayLabel}
                      setAmount={() => {}}
                      showOpenWallet={false}
                      showUsdPill={false}
                      amountPlaceholder={toTokenDisplayLabel}
                      readOnlyAmount={true}
                      asset={toToken ? getTokenKey(toToken) : ""}
                      assetDisplayLabel={toTokenTickerLabel}
                      assetOptions={formattedTokens}
                      setAsset={handleToTokenChange}
                      filterAllowedBaseLayers={false}
                      tokenSelectorAlign="right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Address Inputs Section */}
            {(showRefundAddressInput || showDestinationAddressInput) && (
              <div
                className={`hidden md:grid gap-4 mb-6 ${
                  showRefundAddressInput && showDestinationAddressInput
                    ? "md:grid-cols-2"
                    : "md:grid-cols-1"
                }`}
              >
                {showRefundAddressInput && (
                  <SwapAddressInput
                    label={refundAddressLabel}
                    value={refundAddress}
                    onChange={handleRefundAddressChange}
                    onBlur={() => setRefundTouched(true)}
                    placeholder={getAddressPlaceholder(fromToken, "Select from token first", true)}
                    disabled={!fromToken}
                    validationMessage={refundValidation.message}
                    validationState={refundValidation.state}
                    showValidation={showRefundValidation}
                  />
                )}
                {showDestinationAddressInput && (
                  <SwapAddressInput
                    label={destinationAddressLabel}
                    value={destAddress}
                    onChange={handleDestinationAddressChange}
                    onBlur={() => setDestTouched(true)}
                    placeholder={getAddressPlaceholder(toToken, "Select to token first", true)}
                    disabled={!toToken}
                    validationMessage={destinationValidation.message}
                    validationState={destinationValidation.state}
                    showValidation={showDestinationValidation}
                  />
                )}
              </div>
            )}
            {showDestinationAddressInput && (
              <div className="md:hidden mb-6">
                <SwapAddressInput
                  label={destinationAddressLabel}
                  value={destAddress}
                  onChange={handleDestinationAddressChange}
                  onBlur={() => setDestTouched(true)}
                  placeholder={getAddressPlaceholder(toToken, "Select to token first", true)}
                  disabled={!toToken}
                  validationMessage={destinationValidation.message}
                  validationState={destinationValidation.state}
                  showValidation={showDestinationValidation}
                />
              </div>
            )}

            {/* Quote + Confirm + Deposit Flow Panel */}
            {showFlowPanel && (
              <div
                className="mb-6 p-4 rounded-xl border border-gray-800 space-y-3"
                style={{ backgroundColor: "var(--color-background)" }}
              >
                {quoteLoading && !quote && !statusKey?.depositAddress && (
                  <div className="flex flex-col items-center justify-center gap-1.5 min-h-16">
                    <div className="flex gap-0.5">
                      {[0, 0.1, 0.2].map((delay, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">Getting quote</span>
                  </div>
                )}

                {quote && !statusKey?.depositAddress && (
                  <div className="space-y-3">
                    <SwapQuoteDisplay
                      quote={quote}
                      showAmounts={true}
                      selectedSlippage={slippageTolerance}
                      className="border-0 rounded-none p-0"
                    />
                    {confirmLoading && (
                      <div className="flex flex-col items-center justify-center gap-1.5 min-h-14">
                        <div className="flex gap-0.5">
                          {[0, 0.1, 0.2].map((delay, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                              style={{ animationDelay: `${delay}s` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">
                          Confirming quote
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div ref={depositSectionRef}>
                  <SwapDepositDisplay
                    depositUri={depositUri}
                    depositAddress={statusKey?.depositAddress}
                    amountDecimal={depositAmountDecimal}
                    originSymbol={fromToken?.symbol || ""}
                    receivedAmount={quote?.amountOutFormatted}
                    receivedSymbol={quote?.toSymbol || "ZEC"}
                    minimumReceived={quote?.minAmountOut}
                    estimatedTime={quote?.timeEstimate}
                    onSentFunds={handleSentFunds}
                  />
                </div>

                {quoteError && (
                  <div
                    className="p-3 rounded-lg border border-gray-800 text-gray-900 text-sm"
                    style={{ backgroundColor: "var(--color-background)" }}
                  >
                    {quoteError}
                  </div>
                )}
              </div>
            )}

            {/* Slippage Utility Row */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-[220px]">
                <SwapSlippageControl
                  value={slippageTolerance || "2"}
                  onChange={handleSlippageChange}
                  variant="collapsible"
                />
              </div>
            </div>

          </div>

          {/* Back Side - Swap Status Checker */}
          <div
            className={`rounded-3xl border border-gray-800 p-4 md:p-6 shadow-lg ${
              isStatus ? "" : "absolute top-0 left-0 w-full"
            }`}
            style={{
              backgroundColor: "var(--color-background)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="space-y-6">
              <SwapStatusDisplay
                initialDepositAddress={trackingDepositAddress}
              />

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
