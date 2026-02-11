"use client";

import { useState } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import SwapAmountInput from "@/ui/swap/SwapAmountInput";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
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
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);

  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const [refundAddress, setRefundAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("1");

  const [quote, setQuote] = useState<SwapQuoteDisplay | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Lazy load tokens when needed
  const ensureTokensLoaded = async () => {
    if (tokensLoaded || tokensLoading) return tokens;

    setTokensLoading(true);
    setTokensError(null);

    try {
      const result = await getSwapTokens();
      if ("error" in result) {
        setTokensError(result.error);
        return [];
      }

      setTokens(result.tokens);
      setTokensLoaded(true);

      // Set default tokens: ETH and ZEC
      const ethToken = result.tokens.find(t => t.symbol === "ETH");
      const zecToken = result.tokens.find(t => t.symbol === "ZEC");

      if (ethToken && !fromToken) setFromToken(ethToken);
      if (zecToken && !toToken) setToToken(zecToken);

      return result.tokens;
    } catch (err) {
      setTokensError("Failed to load tokens");
      return [];
    } finally {
      setTokensLoading(false);
    }
  };

  const fetchQuote = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      return;
    }

    if (!refundAddress || !destAddress) {
      setQuoteError("Please enter both refund and destination addresses");
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const currentTokens = await ensureTokensLoaded();

      const result = await getSwapQuote({
        fromToken: fromToken.assetId || fromToken.symbol,
        toToken: toToken.assetId || toToken.symbol,
        amountIn: fromAmount,
        destAddress,
        refundAddress,
        slippageTolerance,
        tokens: currentTokens,
      });

      if (result.ok) {
        setQuote(result.display);
        setToAmount(result.display.amountOutFormatted);
      } else {
        setQuote(null);
        setToAmount("");
        setQuoteError(result.error);
      }
    } catch (err) {
      setQuote(null);
      setToAmount("");
      setQuoteError("Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSwapDirection = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);

    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);

    setQuote(null);
    setQuoteError(null);
  };

  const handleFromTokenChange = async (currency: Currency) => {
    const currentTokens = await ensureTokensLoaded();
    const token = currentTokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
    if (token) {
      setFromToken(token);
      setQuote(null);
      setQuoteError(null);
    }
  };

  const handleToTokenChange = async (currency: Currency) => {
    const currentTokens = await ensureTokensLoaded();
    const token = currentTokens.find((t) => t.symbol === currency.symbol && t.blockchain === currency.network);
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

  const fromUsdValue = quote?.amountInUsd ? quote.amountInUsd.toFixed(2) : "0.00";
  const toUsdValue = quote?.amountOutUsd ? quote.amountOutUsd.toFixed(2) : "0.00";

  const canGetQuote = fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && refundAddress && destAddress;

  // Initialize tokens on first render
  if (!tokensLoaded && !tokensLoading) {
    void ensureTokensLoaded();
  }

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
        className="min-h-screen p-4 md:p-8 pt-16"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="relative flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold text-gray-700">Swap</h1>
            <button
              type="button"
              className="absolute right-0 text-gray-400 hover:text-gray-600"
              title="Powered by Near Intents 1Click API"
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

          {/* Error Display */}
          {tokensError && (
            <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700">
              {tokensError}
            </div>
          )}

          {/* Main Swap Card */}
          <div className="rounded-3xl border border-gray-200/50 p-6 shadow-lg" style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Currency Swap Section */}
            <div className="flex items-start gap-3 mb-6">
              {/* From Section */}
              <div className="flex-1">
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
                  className={`p-3 rounded-xl transition-colors ${
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
                    <label className="text-sm font-semibold text-gray-700">To</label>
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                      Select a token
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Inputs Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <SwapAddressInput
                label="Refund Address"
                value={refundAddress}
                onChange={setRefundAddress}
                placeholder={fromToken ? `${fromToken.symbol} address...` : "Select from token first"}
                helpText="Where to refund if swap fails"
                disabled={!fromToken}
              />
              <SwapAddressInput
                label="Address"
                value={destAddress}
                onChange={setDestAddress}
                placeholder={toToken ? `Enter wallet address...` : "Select to token first"}
                showProfileButton
                disabled={!toToken}
              />
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mb-6 p-4 rounded-xl border border-gray-300 bg-gray-50/50">
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

            {/* Get Quote Button */}
            <button
              type="button"
              onClick={fetchQuote}
              disabled={!canGetQuote || quoteLoading}
              className={`w-full px-4 py-3 text-md font-semibold rounded-xl transition-colors ${
                canGetQuote && !quoteLoading
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
              }`}
            >
              {quoteLoading ? "Getting quote..." : "Get a quote"}
            </button>

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
                      setSlippageTolerance(value);
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
