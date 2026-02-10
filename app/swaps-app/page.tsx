"use client";

import { useState } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import SwapAmountInput from "@/ui/swap/SwapAmountInput";
import SwapAddressInput from "@/ui/swap/SwapAddressInput";
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
  const [refundAddress, setRefundAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [showSlippageModal, setShowSlippageModal] = useState(false);

  const handleSwapDirection = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Mock USD values - these would come from real price data
  const fromUsdValue = fromAmount ? (parseFloat(fromAmount) * 2500).toFixed(2) : "0.00";
  const toUsdValue = toAmount ? (parseFloat(toAmount) * 150).toFixed(2) : "0.00";

  const canGetQuote = fromAmount && destinationAddress;

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
          <div className="rounded-3xl border border-gray-200/50 p-6 md:p-8 shadow-lg space-y-6" style={{ backgroundColor: 'var(--color-background)' }}>
            {/* From and To Sections - Side by Side */}
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
              <div className="flex items-center pt-6">
                <button
                  type="button"
                  onClick={handleSwapDirection}
                  className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shadow-md"
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

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Refund Address */}
            <SwapAddressInput
              label="Refund Address"
              value={refundAddress}
              onChange={setRefundAddress}
              placeholder={`${fromCurrency.symbol} address...`}
              helpText={`If the swap fails, funds will be returned to this ${fromCurrency.symbol} address`}
            />

            {/* Destination Address */}
            <SwapAddressInput
              label="Address"
              value={destinationAddress}
              onChange={setDestinationAddress}
              placeholder={`Enter ${toCurrency.symbol} wallet address...`}
              showProfileButton
            />

            {/* Get Quote Button */}
            <button
              type="button"
              disabled={!canGetQuote}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg
                transition-all transform
                ${
                  canGetQuote
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              Get a quote
            </button>
          </div>

          {/* Slippage Settings */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="text-sm text-gray-600">Slippage tolerance</span>
            <button
              type="button"
              onClick={() => setShowSlippageModal(!showSlippageModal)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">
                {slippage}%
              </span>
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Slippage Modal */}
          {showSlippageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Slippage Settings
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowSlippageModal(false)}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Your transaction will revert if the price changes unfavorably by more
                  than this percentage.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["0.5", "1", "3"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSlippage(value)}
                      className={`
                        py-3 rounded-xl font-semibold transition-colors
                        ${
                          slippage === value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setSlippage(value);
                      }
                    }}
                    placeholder="Custom"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-600 font-semibold">%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
