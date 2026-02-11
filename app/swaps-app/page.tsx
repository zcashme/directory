"use client";

import { useEffect } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import SwapAmountInput from "@/ui/swap/SwapAmountInput";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
import type { Currency } from "@/ui/swap/CurrencySelector";
import { getSwapQuote } from "@/lib/swap/oneClick";
import type { Token } from "@/lib/swap/types";
import { useSwapsStore } from "@/lib/stores/swaps";

function tokenToCurrency(token: Token): Currency {
  return {
    symbol: token.symbol,
    name: token.symbol,
    network: token.blockchain,
  };
}

export default function SwapsPage() {
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
    exchangeRate,
    rateFetched,
    loadTokens,
    fetchExchangeRate,
  } = store;

  // Load tokens on mount
  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  // Fetch exchange rate when fromToken changes
  useEffect(() => {
    if (!fromToken) return;

    store.setRateFetched(false);
    void fetchExchangeRate(fromToken.symbol);
  }, [fromToken, fetchExchangeRate]);

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
    } catch (err) {
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
    } catch (err) {
      store.setQuoteError("Failed to confirm quote");
    } finally {
      store.setConfirmLoading(false);
    }
  };

  const handleSwapDirection = () => {
    store.swapDirection();
  };

  const handleFromTokenChange = (currency: Currency) => {
    const token = tokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
    if (token) {
      store.setFromToken(token);
      store.setQuote(null);
      store.setQuoteError(null);
    }
  };

  const handleToTokenChange = (currency: Currency) => {
    const token = tokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
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

  // Calculate USD values - use quote values if available, otherwise calculate from exchange rate
  const fromUsdValue = quote?.amountInUsd
    ? quote.amountInUsd.toFixed(2)
    : rateFetched && fromAmount
      ? (parseFloat(fromAmount) * exchangeRate).toFixed(2)
      : "0.00";
  const toUsdValue = quote?.amountOutUsd ? quote.amountOutUsd.toFixed(2) : "—";

  const canGetQuote = fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && refundAddress && destAddress;

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

  return (
    <>
      <ProfileHeader />
      <div
        className="p-4 md:p-8 pt-16 border-2 border-red-500"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-5xl mx-auto border-2 border-orange-500">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold text-gray-700">Swap</h1>
          </div>

          {/* Error Display */}
          {tokensError && (
            <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700">
              {tokensError}
            </div>
          )}

          {/* Main Swap Card */}
          <div className="rounded-3xl border-2 border-yellow-500 p-6 shadow-lg relative" style={{ backgroundColor: 'var(--color-background)' }}>
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
            <div className="flex items-start gap-3 mb-6 border-2 border-green-500">
              {/* From Section */}
              <div className="flex-1 border-2 border-blue-500">
                {fromToken ? (
                  <SwapAmountInput
                    label="From"
                    currency={tokenToCurrency(fromToken)}
                    amount={fromAmount}
                    usdValue={fromUsdValue}
                    onCurrencyChange={handleFromTokenChange}
                    onAmountChange={handleFromAmountChange}
                    availableTokens={tokens}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">From</label>
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                      Select a token
                    </div>
                  </div>
                )}
              </div>

              {/* Swap Direction Button */}
              <div className="flex items-center pt-8">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  disabled={!fromToken || !toToken}
                  className={`p-3 rounded-xl transition-colors rotate-90 ${
                    fromToken && toToken
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                      : "bg-gray-100 opacity-50 cursor-not-allowed text-gray-400"
                  }`}
                  title="Swap direction"
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
              <div className="flex-1 border-2 border-cyan-500">
                {toToken ? (
                  <SwapAmountInput
                    label="To"
                    currency={tokenToCurrency(toToken)}
                    amount={toAmount}
                    usdValue={toUsdValue}
                    onCurrencyChange={handleToTokenChange}
                    onAmountChange={store.setToAmount}
                    readOnly
                    availableTokens={tokens}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">To</label>
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                      Select a token
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Inputs Section */}
            <div className="grid grid-cols-2 gap-4 mb-6 border-2 border-purple-500">
              <SwapAddressInput
                label="Refund Address"
                value={refundAddress}
                onChange={store.setRefundAddress}
                placeholder={fromToken ? `${fromToken.symbol} address...` : "Select from token first"}
                helpText="Where to refund if swap fails"
                disabled={!fromToken}
              />
              <SwapAddressInput
                label="Address"
                value={destAddress}
                onChange={store.setDestAddress}
                placeholder={toToken ? `Enter wallet address...` : "Select to token first"}
                showProfileButton
                disabled={!toToken}
              />
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mb-6 p-4 rounded-xl border border-gray-800" style={{ backgroundColor: '#faf6ed' }}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Min Received</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {quote.minAmountOut || "—"} {quote.toSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Est. Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {quote.timeEstimate || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {quoteError && (
              <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
                {quoteError}
              </div>
            )}

            {/* Quote Action Buttons */}
            <div className="flex gap-3">
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

            {/* Slippage Settings */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-sm text-gray-600">Slippage tolerance</span>
              <input
                type="text"
                inputMode="decimal"
                value={slippageTolerance}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value)) {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num >= 0 && num <= 100) {
                      store.setSlippageTolerance(value);
                    }
                  }
                }}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">%</span>
              <button
                type="button"
                className="p-1.5 text-gray-400 hover:text-gray-600"
                title="Adjust slippage settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
