"use client";

import { useState } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import SwapAmountInput from "@/ui/swap/SwapAmountInput";
import type { Currency } from "@/ui/swap/CurrencySelector";

export default function SwapsPage() {
  const [fromCurrency, setFromCurrency] = useState<Currency>({
    symbol: "ETH",
    name: "Ethereum",
  });
  const [toCurrency, setToCurrency] = useState<Currency>({
    symbol: "ZEC",
    name: "Zcash",
  });
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const handleSwapDirection = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Mock USD values - these would come from real price data
  const fromUsdValue = fromAmount ? (parseFloat(fromAmount) * 2500).toFixed(2) : "0.00";
  const toUsdValue = toAmount ? (parseFloat(toAmount) * 150).toFixed(2) : "0.00";

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
          <div className="rounded-3xl border border-gray-200/50 p-8 shadow-lg" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="flex items-center gap-4">
              {/* From Section */}
              <div className="flex-1">
                <SwapAmountInput
                  label="From"
                  currency={fromCurrency}
                  amount={fromAmount}
                  usdValue={fromUsdValue}
                  onCurrencyChange={setFromCurrency}
                  onAmountChange={setFromAmount}
                />
              </div>

              {/* Swap Direction Button */}
              <div className="flex items-center pt-8">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Swap direction"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
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
                <SwapAmountInput
                  label="To"
                  currency={toCurrency}
                  amount={toAmount}
                  usdValue={toUsdValue}
                  onCurrencyChange={setToCurrency}
                  onAmountChange={setToAmount}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
