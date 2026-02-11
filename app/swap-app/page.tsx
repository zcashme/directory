"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
import SwapQuoteDisplay from "@/ui/swap/SwapQuoteDisplay";
import SwapSlippageControl from "@/ui/swap/SwapSlippageControl";
import { getSwapQuote } from "@/lib/swap/oneClick";
import { useSwapsStore } from "@/lib/stores/swaps";
import { parseTokenSymbol } from "@/lib/swap/utils";
import { getSwapStatus } from "@/lib/swap/oneClick";
import type { SwapStatusData } from "@/lib/swap/types";
import SwapCurrencyPair, { TokenIcon } from "@/ui/swap/SwapCurrencyPair";

const STATUS_CONFIG = {
  SUCCESS: { color: "bg-green-100 text-green-700", label: "Success" },
  FAILED: { color: "bg-red-100 text-red-700", label: "Failed" },
  REFUNDED: { color: "bg-red-100 text-red-700", label: "Refunded" },
  INCOMPLETE_DEPOSIT: { color: "bg-red-100 text-red-700", label: "Incomplete" },
  PROCESSING: { color: "bg-blue-100 text-blue-700", label: "Processing" },
  PENDING_DEPOSIT: { color: "bg-blue-100 text-blue-700", label: "Pending" },
} as const;

function SwapStatusDisplay({ depositAddress, onReset }: { depositAddress: string; onReset: () => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusData, setStatusData] = useState<SwapStatusData | null>(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const result = await getSwapStatus(depositAddress);

        if ("error" in result) {
          setStatusError('Unable to fetch status');
          return;
        }

        setStatusData(result);
        setStatusError('');

        // Stop polling on terminal states
        if (['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(result.status?.toUpperCase())) {
          if (interval) clearInterval(interval);
        }
      } catch {
        setStatusError('Connection error');
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    interval = setInterval(poll, 5000);

    // Cleanup
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [depositAddress]);

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
        <div className="text-red-600 text-sm border border-red-300 rounded-xl p-3 bg-red-50">
          {statusError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onReset}
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

function SwapsPageContent() {
  const depositAddress = useSearchParams().get("depositAddress");
  return <SwapCreationPage initialDepositAddress={depositAddress} />;
}

function SwapCreationPage({ initialDepositAddress }: { initialDepositAddress: string | null }) {
  const [isStatus, setIsStatus] = useState(!!initialDepositAddress);
  const [checkDepositAddress, setCheckDepositAddress] = useState(initialDepositAddress || "");

  const store = useSwapsStore();
  const {
    tokens,
    tokensLoading,
    tokensError,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    refundAddress,
    destAddress,
    slippageTolerance,
    quote,
    quoteLoading,
    quoteError,
    confirmLoading,
    showInfo,
    loadTokens,
  } = store;

  // Load tokens on mount
  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const fetchQuote = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      return;
    }

    if (!refundAddress || !destAddress) {
      store.setQuoteError("Please enter both refund and destination addresses");
      return;
    }

    store.setQuoteLoading(true);
    store.setQuoteError(null);

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
        store.setQuote(result.display);
        store.setToAmount(result.display.amountOutFormatted);
      } else {
        store.setQuote(null);
        store.setToAmount("");
        store.setQuoteError(result.error);
      }
    } catch {
      store.setQuote(null);
      store.setToAmount("");
      store.setQuoteError("Failed to get quote");
    } finally {
      store.setQuoteLoading(false);
    }
  };

  const confirmQuote = async () => {
    if (!quote || !fromToken || !toToken) return;

    store.setConfirmLoading(true);
    store.setQuoteError(null);

    try {
      // TODO: Implement actual quote confirmation logic
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      store.setQuoteError("Failed to confirm quote");
    } finally {
      store.setConfirmLoading(false);
    }
  };

  const handleSwapDirection = () => {
    store.swapDirection();
  };

  const handleFromTokenChange = (tokenId: string) => {
    const token = tokens.find((t) => (t.id || t.assetId || t.symbol) === tokenId);
    if (token) {
      store.setFromToken(token);
      store.setQuote(null);
      store.setQuoteError(null);
    }
  };

  const handleToTokenChange = (tokenId: string) => {
    const token = tokens.find((t) => (t.id || t.assetId || t.symbol) === tokenId);
    if (token) {
      store.setToToken(token);
      store.setQuote(null);
      store.setQuoteError(null);
    }
  };

  const handleFromAmountChange = (amount: string) => {
    store.setFromAmount(amount);
    if (quote) {
      store.setQuote(null);
      store.setToAmount("");
    }
  };

  const canGetQuote = fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && refundAddress && destAddress;

  // Format tokens for AmountAndWallet
  const formattedTokens = tokens.map((token) => ({
    id: token.id || token.assetId || token.symbol,
    symbol: token.symbol,
    chain: token.blockchain,
    logo: token.logo || "",
  }));

  if (tokensLoading && tokens.length === 0) {
    return (
      <>
        <ProfileHeader />
        <div
          className="min-h-screen p-4 md:p-8 pt-16 flex items-center justify-center"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <p className="text-gray-600">Loading tokens...</p>
        </div>
      </>
    );
  }

  const handleResetStatusCheck = () => {
    setIsStatus(false);
    setCheckDepositAddress("");
  };

  return (
    <>
      <ProfileHeader />
      <div
        className="p-4 md:p-8 pt-16"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Error Display */}
          {tokensError && (
            <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700">
              {tokensError}
            </div>
          )}

          {/* Flip Card Container */}
          <div className="relative" style={{ perspective: "1000px", minHeight: "600px" }}>
            <div
              className="relative w-full transition-transform duration-700"
              style={{
                transformStyle: "preserve-3d",
                transform: isStatus ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front Side - Main Swap Card */}
              <div
                className="rounded-3xl border border-gray-800 p-6 shadow-lg relative"
                style={{
                  backgroundColor: 'var(--color-background)',
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
            {/* Info Icon with Tooltip */}
            <div
              className="absolute top-6 right-6"
              onMouseEnter={() => store.setShowInfo(true)}
              onMouseLeave={() => store.setShowInfo(false)}
            >
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
              {showInfo && (
                <div className="absolute top-8 right-0 w-64 p-3 rounded-xl border border-gray-300 bg-white shadow-lg z-10">
                  <p className="text-sm text-gray-700 font-semibold mb-1">Powered by Near Intents</p>
                  <p className="text-xs text-gray-600">
                    This swap interface uses the Near Intents 1Click API to provide cross-chain cryptocurrency swaps with competitive rates and fast execution.
                  </p>
                </div>
              )}
            </div>
            {/* Currency Swap Section */}
            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
              {/* From Section */}
              <div className="flex-1">
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

              {/* Swap Direction Button */}
              <div className="flex items-center justify-center md:pb-1">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  disabled={!fromToken || !toToken}
                  className={`p-3 rounded-xl transition-colors md:rotate-90 border border-gray-800 ${
                    fromToken && toToken
                      ? "hover:bg-gray-100 text-gray-600"
                      : "opacity-50 cursor-not-allowed text-gray-400"
                  }`}
                  title="Swap direction"
                  style={fromToken && toToken ? { backgroundColor: "var(--color-background)" } : {}}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </button>
              </div>

              {/* To Section */}
              <div className="flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">To</label>
                  <AmountAndWallet
                    amount={toAmount}
                    setAmount={store.setToAmount}
                    showUsdPill={false}
                    showOpenWallet={false}
                    asset={toToken?.symbol || ""}
                    assetOptions={formattedTokens}
                    setAsset={handleToTokenChange}
                  />
                </div>
              </div>
            </div>

            {/* Address Inputs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <SwapAddressInput
                label="Refund Address"
                value={refundAddress}
                onChange={store.setRefundAddress}
                placeholder={fromToken ? `${fromToken.symbol} address...` : "Select from token first"}
                disabled={!fromToken}
              />
              <SwapAddressInput
                label="Destination Address"
                value={destAddress}
                onChange={store.setDestAddress}
                placeholder={toToken ? `${toToken.symbol} address...` : "Select to token first"}
                disabled={!toToken}
              />
            </div>

            {/* Quote Display */}
            {quote && <SwapQuoteDisplay quote={quote} className="mb-6" />}

            {/* Error Display */}
            {quoteError && (
              <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
                {quoteError}
              </div>
            )}

            {/* Quote Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={fetchQuote}
                disabled={!canGetQuote || quoteLoading}
                className={`flex-1 px-4 py-3 text-md font-semibold rounded-xl ${
                  canGetQuote && !quoteLoading
                    ? "text-gray-900 transition-colors cursor-pointer border border-gray-800"
                    : "bg-gray-100 text-gray-400 border border-gray-300"
                }`}
                style={canGetQuote && !quoteLoading ? { backgroundColor: "var(--color-background)" } : {}}
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

            {/* Check Swap Link */}
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

            {/* Slippage Settings */}
            <div className="mt-4">
              <SwapSlippageControl
                value={slippageTolerance}
                onChange={store.setSlippageTolerance}
                variant="inline"
              />
            </div>
              </div>

              {/* Back Side - Swap Status Checker */}
              <div
                className="rounded-3xl border border-gray-800 p-6 shadow-lg absolute top-0 left-0 w-full"
                style={{
                  backgroundColor: 'var(--color-background)',
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Check Swap Status</h2>
                    <button
                      onClick={handleResetStatusCheck}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to Swap
                    </button>
                  </div>

                  {!checkDepositAddress ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Enter Deposit Address
                      </label>
                      <input
                        type="text"
                        placeholder="Paste your deposit address..."
                        className="w-full border border-gray-800 px-3 py-3 rounded-xl text-md text-gray-900 focus:ring-1 focus:ring-blue-500 mb-4"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
                              setCheckDepositAddress(value);
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value) {
                            setCheckDepositAddress(value);
                          }
                        }}
                        className="w-full px-4 py-3 text-md font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Check Status
                      </button>
                    </div>
                  ) : (
                    <SwapStatusDisplay
                      depositAddress={checkDepositAddress}
                      onReset={() => setCheckDepositAddress("")}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SwapsPage() {
  return (
    <Suspense
      fallback={
        <>
          <ProfileHeader />
          <div className="min-h-screen p-4 md:p-8 pt-12" style={{ backgroundColor: "var(--color-background)" }}>
            <div className="max-w-2xl mx-auto">
              <h1 className="text-md font-semibold mb-6">Loading...</h1>
              <div className="text-center text-gray-600">Please wait...</div>
            </div>
          </div>
        </>
      }
    >
      <SwapsPageContent />
    </Suspense>
  );
}
