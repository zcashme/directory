"use client";

import { useState, useEffect, useCallback } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import SwapAmountInput from "@/ui/swap/SwapAmountInput";
import type { Currency } from "@/ui/swap/CurrencySelector";
import { getSwapTokens, getSwapQuote } from "@/lib/swap/oneClick";
import type { Token, SwapQuoteDisplay } from "@/lib/swap/types";

function tokenToCurrency(token: Token): Currency {
  return {
    symbol: token.symbol,
    name: token.symbol,
    network: token.blockchain,
  };
}

export default function SwapsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const [quote, setQuote] = useState<SwapQuoteDisplay | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fetch tokens on mount
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const result = await getSwapTokens();
        if ("error" in result) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setTokens(result.tokens);
        setLoading(false);
      } catch (err) {
        setError("Failed to load tokens");
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Fetch quote on manual button click
  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    try {
      const result = await getSwapQuote({
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amountIn: fromAmount,
        destAddress: "dest.example",
        refundAddress: "refund.example",
        tokens,
      });

      if (result.ok) {
        setQuote(result.display);
        setToAmount(result.display.amountOutFormatted);
      } else {
        setQuote(null);
        setToAmount("");
      }
    } catch {
      setQuote(null);
      setToAmount("");
    } finally {
      setQuoteLoading(false);
    }
  }, [fromToken, toToken, fromAmount, tokens]);

  const handleSwapDirection = () => {
    // Swap tokens and amounts
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);

    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    setQuote(null);
  };

  const fromUsdValue = quote?.amountInUsd ? quote.amountInUsd.toFixed(2) : "0.00";
  const toUsdValue = quote?.amountOutUsd ? quote.amountOutUsd.toFixed(2) : "0.00";

  if (loading) {
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

  if (error) {
    return (
      <>
        <ProfileHeader />
        <div
          className="min-h-screen p-4 md:p-8 pt-16 flex items-center justify-center"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <p className="text-red-600">Error: {error}</p>
        </div>
      </>
    );
  }


  const handleFromTokenChange = (currency: Currency) => {
    const token = tokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
    if (token) setFromToken(token);
  };

  const handleToTokenChange = (currency: Currency) => {
    const token = tokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
    if (token) setToToken(token);
  };

  return (
    <>
      <ProfileHeader />
      <div
        className="min-h-screen p-4 md:p-8 pt-16"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="relative flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold text-gray-700">Swap</h1>
            <button
              type="button"
              className="absolute right-0 text-gray-400 hover:text-gray-600"
              title="Powered by Near Intents"
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
          </div>

          {/* Main Swap Card */}
          <div className="rounded-3xl border border-gray-200/50 p-6 shadow-lg" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="flex items-center gap-3">
              {/* From Section */}
              <div className="flex-1">
                {fromToken ? (
                  <SwapAmountInput
                    label="From"
                    currency={tokenToCurrency(fromToken)}
                    amount={fromAmount}
                    usdValue={fromUsdValue}
                    onCurrencyChange={handleFromTokenChange}
                    onAmountChange={setFromAmount}
                    availableTokens={tokens}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-600">From</label>
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                      Select a token
                    </div>
                  </div>
                )}
              </div>

              {/* Swap Direction Button */}
              <div className="flex items-center pt-6">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  disabled={!fromToken || !toToken}
                  className={`p-2.5 rounded-xl transition-colors ${
                    fromToken && toToken ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-100 opacity-50 cursor-not-allowed"
                  }`}
                  title="Swap direction"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
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
                {toToken ? (
                  <SwapAmountInput
                    label="To"
                    currency={tokenToCurrency(toToken)}
                    amount={toAmount}
                    usdValue={toUsdValue}
                    onCurrencyChange={handleToTokenChange}
                    onAmountChange={setToAmount}
                    readOnly
                    availableTokens={tokens}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-600">To</label>
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                      Select a token
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mt-6 p-4 rounded-xl border border-gray-300 bg-gray-50">
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

            {/* Get Quote Button */}
            <div className="mt-6">
              {!fromToken || !toToken ? (
                <div className="w-full px-4 py-3 text-md font-semibold text-center rounded-xl bg-gray-100 text-gray-400">
                  {!fromToken && !toToken ? "Select tokens to swap" : !fromToken ? "Select from token" : "Select to token"}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void fetchQuote()}
                  disabled={!fromAmount || parseFloat(fromAmount) <= 0 || quoteLoading}
                  className={`w-full px-4 py-3 text-md font-semibold border border-gray-800 rounded-xl transition-colors ${
                    !fromAmount || parseFloat(fromAmount) <= 0 || quoteLoading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                      : "text-gray-800 hover:bg-gray-100"
                  }`}
                  style={
                    !(!fromAmount || parseFloat(fromAmount) <= 0 || quoteLoading)
                      ? { backgroundColor: "var(--color-background)" }
                      : undefined
                  }
                >
                  {quoteLoading ? "Getting quote..." : "Get Quote"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
