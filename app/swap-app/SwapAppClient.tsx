"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
import SwapQuoteDisplay from "@/ui/swap/SwapQuoteDisplay";
import SwapSlippageControl from "@/ui/swap/SwapSlippageControl";
import SwapDepositDisplay from "@/ui/swap/SwapDepositDisplay";
import { getSwapQuote, confirmSwap, getSwapTokens, getSwapStatus } from "@/lib/swap/oneClick";
import { parseTokenSymbol } from "@/lib/swap/utils";
import SwapCurrencyPair, { TokenIcon } from "@/ui/swap/SwapCurrencyPair";
import type { Token, SwapQuoteDisplay as SwapQuoteDisplayType } from "@/lib/swap/types";

const STATUS_CONFIG = {
  SUCCESS: { color: "bg-green-100 text-green-700", label: "Success" },
  FAILED: { color: "bg-red-100 text-red-700", label: "Failed" },
  REFUNDED: { color: "bg-red-100 text-red-700", label: "Refunded" },
  INCOMPLETE_DEPOSIT: { color: "bg-red-100 text-red-700", label: "Incomplete" },
  PROCESSING: { color: "bg-blue-100 text-blue-700", label: "Processing" },
  PENDING_DEPOSIT: { color: "bg-blue-100 text-blue-700", label: "Pending" },
} as const;

function SwapStatusDisplay({ initialDepositAddress }: { initialDepositAddress: string }) {
  const [depositAddress, setDepositAddress] = useState(initialDepositAddress);
  const [inputAddress, setInputAddress] = useState("");
  const [showInput, setShowInput] = useState(!initialDepositAddress);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Poll swap status every 5 seconds
  const { data: statusResult, error } = useQuery({
    queryKey: ["swapStatus", depositAddress],
    queryFn: () => getSwapStatus(depositAddress),
    enabled: !!depositAddress && !showInput,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || "error" in data) return 5000;

      const status = data.status?.toUpperCase();
      const isTerminal = ['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(status || "");

      // Stop polling if terminal state reached
      return isTerminal ? false : 5000;
    },
  });

  const statusData = statusResult && "status" in statusResult ? statusResult : null;
  const statusError = statusResult && "error" in statusResult ? statusResult.error : (error?.message || "");

  const status = statusData?.status?.toUpperCase() || "PENDING_DEPOSIT";
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING_DEPOSIT;
  const isPolling = !['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(status);

  const details = statusData?.swapDetails;
  const quote = statusData?.quoteResponse?.quote;
  const request = statusData?.quoteResponse?.quoteRequest;

  const fromSymbol = parseTokenSymbol(request?.originAsset) || "";
  const toSymbol = parseTokenSymbol(request?.destinationAsset) || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-md font-semibold">Swap Status</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.color}`}>
            {config.label}
          </span>
          {isPolling && (
            <div className="flex items-center gap-1.5">
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
                {status === "PENDING_DEPOSIT" ? "Receiving" : "Swapping"}
              </span>
            </div>
          )}
        </div>

        {fromSymbol && toSymbol && (
          <div className="flex justify-center py-4">
            <SwapCurrencyPair
              fromSymbol={fromSymbol}
              toSymbol={toSymbol}
              size="lg"
              showLabel={true}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">
            Sent
          </p>
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
          <p className="text-xs text-gray-600 mb-2">
            Received
          </p>
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

      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 font-semibold"
        >
          <span>Swap Details</span>
          <span className={`transform transition ${detailsOpen ? "rotate-180" : ""}`}>▼</span>
        </button>

        {detailsOpen && (
          <div className="border-t border-gray-800 px-4 py-3 space-y-3 text-sm">
            {[
              {
                label: "Origin Asset",
                value: request?.originAsset ? parseTokenSymbol(request.originAsset) : null,
              },
              {
                label: "Destination Asset",
                value: request?.destinationAsset ? parseTokenSymbol(request.destinationAsset) : null,
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
                  quote?.deadline &&
                  new Date(quote.deadline).toLocaleString(),
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
              ) : null
            )}
          </div>
        )}
      </div>

      {statusError && (
        <div
          className="text-gray-900 text-sm border border-gray-800 rounded-xl p-3"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          {statusError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setInputAddress("");
            setShowInput(true);
          }}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
        >
          Check Another
        </button>
        <button
          onClick={async () => {
            const shareUrl = window.location.href;
            if (navigator.share) {
              try {
                await navigator.share({
                  title: "Swap Status",
                  text: "Check out this swap status:",
                  url: shareUrl,
                });
              } catch {
                // User cancelled
              }
            }
          }}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
        >
          Share Link
        </button>
      </div>
    </div>
  );
}

export default function SwapAppClient({ initialDepositAddress }: { initialDepositAddress: string | null }) {
  const [isStatus, setIsStatus] = useState(!!initialDepositAddress);
  const [trackingDepositAddress, setTrackingDepositAddress] = useState<string>(initialDepositAddress || "");

  // Token state
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);

  // Swap form state
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("1");

  // Quote state
  const [quote, setQuote] = useState<SwapQuoteDisplayType | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Deposit state (after confirmation)
  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState<{ depositAddress: string } | null>(null);
  const [depositAmountDecimal, setDepositAmountDecimal] = useState("");

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
      localStorage.setItem("swapTrackingDepositAddress", trackingDepositAddress);
    }
  }, [trackingDepositAddress]);

  // Load tokens on mount
  useEffect(() => {
    const loadTokens = async () => {
      setTokensLoading(true);
      setTokensError(null);

      try {
        const result = await getSwapTokens();

        if ("tokens" in result) {
          setTokens(result.tokens);
          // Set default tokens if available
          if (result.tokens.length >= 2) {
            setFromToken(result.tokens[0]);
            setToToken(result.tokens[1]);
          }
        } else {
          setTokensError(result.error);
        }
      } catch (error) {
        setTokensError("Failed to load tokens");
      } finally {
        setTokensLoading(false);
      }
    };

    void loadTokens();
  }, []);

  const fetchQuote = async () => {
    if (!fromToken || !toToken) return;

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
        setQuote(result.display);
        setToAmount(result.display.amountOutFormatted);
      } else {
        setQuote(null);
        setToAmount("");
        setQuoteError(result.error);
      }
    } catch {
      setQuote(null);
      setToAmount("");
      setQuoteError("Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmQuote = async () => {
    if (!quote || !fromToken || !toToken) return;

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
        setDepositUri(result.paymentUri);
        setStatusKey(result.statusKey);
        setDepositAmountDecimal(result.deposit?.amountDecimal ?? "");
      } else {
        setQuoteError(result.error);
      }
    } catch {
      setQuoteError("Failed to confirm quote");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSwapDirection = () => {
    const tempFrom = fromToken;
    const tempTo = toToken;
    const tempFromAmount = fromAmount;
    const tempToAmount = toAmount;

    setFromToken(tempTo);
    setToToken(tempFrom);
    setFromAmount(tempToAmount);
    setToAmount(tempFromAmount);

    // Swap addresses too
    const tempRefund = refundAddress;
    setRefundAddress(destAddress);
    setDestAddress(tempRefund);

    // Clear quote since direction changed
    setQuote(null);
    setQuoteError(null);
  };

  const handleFromTokenChange = (tokenId: string) => {
    const token = tokens.find((t) => (t.id || t.assetId || t.symbol) === tokenId);
    if (token) {
      setFromToken(token);
      setQuote(null);
      setQuoteError(null);
    }
  };

  const handleToTokenChange = (tokenId: string) => {
    const token = tokens.find((t) => (t.id || t.assetId || t.symbol) === tokenId);
    if (token) {
      setToToken(token);
      setQuote(null);
      setQuoteError(null);
    }
  };

  const handleFromAmountChange = (amount: string) => {
    setFromAmount(amount);
    if (quote) {
      setQuote(null);
      setToAmount("");
    }
  };

  const handleSentFunds = () => {
    if (statusKey?.depositAddress) {
      setTrackingDepositAddress(statusKey.depositAddress);
      setIsStatus(true);
    }
  };

  // Format tokens for AmountAndWallet
  const formattedTokens = tokens.map((token) => ({
    id: token.id || token.assetId || token.symbol,
    symbol: token.symbol,
    chain: token.blockchain,
    logo: token.logo || "",
  }));

  if (tokensLoading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading tokens...</p>
      </div>
    );
  }


  return (
    <>
      {/* Error Display */}
      {tokensError && (
        <div
          className="mb-4 p-4 rounded-xl border border-gray-800 text-gray-900"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          {tokensError}
        </div>
      )}

      {/* Flip Card Container */}
      <div className="relative overflow-visible" style={{ perspective: "1000px", minHeight: "600px" }}>
        <div
          className="relative w-full transition-transform duration-300 overflow-visible"
          style={{
            transformStyle: "preserve-3d",
            transform: isStatus ? "rotateX(180deg)" : "rotateX(0deg)",
          }}
        >
          {/* Front Side - Main Swap Card */}
          <div
            className="rounded-3xl border border-gray-800 p-6 shadow-lg relative overflow-visible"
            style={{
              backgroundColor: 'var(--color-background)',
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Info Icon with Tooltip */}
            <div className="absolute top-6 right-6 group">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <div className="hidden group-hover:block absolute top-8 right-0 w-64 p-3 rounded-xl border border-gray-300 bg-white shadow-lg z-10">
                <p className="text-sm text-gray-700 font-semibold mb-1">Powered by Near Intents</p>
                <p className="text-xs text-gray-600">
                  This swap interface uses the Near Intents 1Click API to provide cross-chain cryptocurrency swaps with competitive rates and fast execution.
                </p>
              </div>
            </div>
            {/* Currency Swap Section */}
            <div className="relative mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* From Section */}
                <div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">From</label>
                    <AmountAndWallet
                      amount={fromAmount}
                      setAmount={handleFromAmountChange}
                      showUsdPill={true}
                      showOpenWallet={false}
                      asset={fromToken?.symbol || ""}
                      assetOptions={formattedTokens}
                      setAsset={handleFromTokenChange}
                    />
                  </div>
                </div>

                {/* To Section */}
                <div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">To</label>
                    <AmountAndWallet
                      amount={toAmount}
                      setAmount={setToAmount}
                      showUsdPill={false}
                      showOpenWallet={false}
                      asset={toToken?.symbol || ""}
                      assetOptions={formattedTokens}
                      setAsset={handleToTokenChange}
                    />
                  </div>
                </div>
              </div>

              {/* Swap Direction Button - Centered */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  disabled={!fromToken || !toToken}
                  className={`p-2 rounded-xl transition-colors border border-gray-800 ${
                    fromToken && toToken
                      ? "hover:bg-gray-100 text-gray-600"
                      : "opacity-50 cursor-not-allowed text-gray-400"
                  }`}
                  title="Swap direction"
                  style={fromToken && toToken ? { backgroundColor: "var(--color-background)" } : {}}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Address Inputs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <SwapAddressInput
                label="Refund Address"
                value={refundAddress}
                onChange={setRefundAddress}
                placeholder={fromToken ? `${fromToken.symbol} address...` : "Select from token first"}
                disabled={!fromToken}
              />
              <SwapAddressInput
                label="Destination Address"
                value={destAddress}
                onChange={setDestAddress}
                placeholder={toToken ? `${toToken.symbol} address...` : "Select to token first"}
                disabled={!toToken}
              />
            </div>

            {/* Quote Display */}
            {quote && <SwapQuoteDisplay quote={quote} className="mb-6" />}

            {/* Swap Deposit Display */}
            <SwapDepositDisplay
              depositUri={depositUri}
              depositAddress={statusKey?.depositAddress}
              amountDecimal={depositAmountDecimal}
              originSymbol={fromToken?.symbol || ""}
              onSentFunds={handleSentFunds}
            />

            {/* Error Display */}
            {quoteError && (
              <div
                className="mb-6 p-4 rounded-xl border border-gray-800 text-gray-900 text-sm"
                style={{ backgroundColor: 'var(--color-background)' }}
              >
                {quoteError}
              </div>
            )}

            {/* Quote Action Buttons */}
            {!statusKey?.depositAddress && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={fetchQuote}
                  disabled={quoteLoading}
                  className={`flex-1 px-4 py-3 text-md font-semibold rounded-xl ${
                    !quoteLoading
                      ? "text-gray-900 transition-colors cursor-pointer border border-gray-800"
                      : "bg-gray-100 text-gray-400 border border-gray-300"
                  }`}
                  style={!quoteLoading ? { backgroundColor: "var(--color-background)" } : {}}
                >
                  {quoteLoading ? "Getting quote..." : "Get a quote"}
                </button>
                <button
                  type="button"
                  onClick={confirmQuote}
                  disabled={!quote || confirmLoading}
                  className={`flex-1 px-4 py-3 text-md font-semibold rounded-xl ${
                    quote && !confirmLoading
                      ? "text-gray-900 transition-colors cursor-pointer border border-gray-800"
                      : "bg-gray-100 text-gray-400 border border-gray-300"
                  }`}
                  style={quote && !confirmLoading ? { backgroundColor: "var(--color-background)" } : {}}
                >
                  {confirmLoading ? "Confirming..." : "Confirm quote"}
                </button>
              </div>
            )}

            {/* Slippage Settings */}
            {!statusKey?.depositAddress && (
              <div className="mt-4">
                <SwapSlippageControl
                  value={slippageTolerance}
                  onChange={setSlippageTolerance}
                  variant="inline"
                />
              </div>
            )}

            {/* Check Swap Link */}
            {!statusKey?.depositAddress && (
              <div className="text-center text-sm text-gray-600 mt-3">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsStatus(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Check Swap
                </a>
              </div>
            )}
          </div>

          {/* Back Side - Swap Status Checker */}
          <div
            className="rounded-3xl border border-gray-800 p-6 shadow-lg absolute top-0 left-0 w-full"
            style={{
              backgroundColor: 'var(--color-background)',
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateX(180deg)",
            }}
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Check Swap Status</h2>
                <button
                  onClick={() => setIsStatus(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to Swap
                </button>
              </div>

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
