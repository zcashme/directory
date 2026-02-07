"use client";
import { useContext } from "react";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import { SwapContext } from "@/app/[slug]/providers/swap-provider";
import { getTokenId } from "@/lib/swap/swapPayload";
import SwapDepositDisplay from "@/ui/swap/SwapDepositDisplay";

export default function SwapComposer({ profile }) {
  const {
    // Token state
    tokenOptions,
    originTokenId,
    originSymbol,
    zecTokenId,

    // Swap input state
    swapAmount,
    refundAddress,
    slippageTolerance,

    // Quote output state
    quotePreview,
    quoteData,

    // Swap output state
    depositUri,
    statusKey,
    swapStatus,

    // UI state
    isGettingQuote,
    isConfirming,
    quoteStatus,
    swapError,
    pollingState,

    // Computed
    isSwapMode,

    // Actions
    setToken,
    setSwapAmount,
    setRefundAddress,
    setSlippageTolerance,
    getQuote,
    confirmSwap,
    resetSwapState,
  } = useContext(SwapContext);

  const recipientName = profile?.display_name || profile?.name || "Recipient";

  // Validation checks
  const canGetQuote = !isGettingQuote && swapAmount && refundAddress && parseFloat(swapAmount) > 0;
  const canConfirmQuote = !isConfirming && quotePreview;

  // Format tokens for selector
  const formattedTokenOptions = tokenOptions.map((token) => ({
    id: getTokenId(token),
    symbol: token.symbol || token.ticker || "?",
    chain: token.blockchain || "",
    logo: token.logo || "",
  }));

  // Handlers
  const handleTokenChange = (tokenId) => {
    setToken(tokenId);
  };

  const handleGetQuote = async () => {
    await getQuote({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: refundAddress,
      slippage: slippageTolerance,
    });
  };

  const handleConfirmQuote = async () => {
    await confirmSwap({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: refundAddress,
      slippage: slippageTolerance,
    });
  };

  const handleSlippageChange = (value) => {
    const numValue = parseFloat(value);
    if (numValue >= 0 && numValue <= 100) {
      setSlippageTolerance(value);
    }
  };

  const slippageOptions = ["0.1", "0.5", "1", "2", "5"];

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">
      {/* HEADER: Back + Recipient */}
      <div className="flex justify-between items-start relative mb-3">
        <button
          type="button"
          onClick={resetSwapState}
          className="text-gray-600 hover:text-gray-800 text-xl pt-1 flex-shrink-0"
          aria-label="Go back to ZEC payment"
        >
          ←
        </button>

        <div className="text-md font-semibold text-gray-800 whitespace-normal pt-2 flex-1 text-center px-3">
          Send to{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        <div className="w-6 flex-shrink-0" />
      </div>

      {/* AMOUNT INPUT + TOKEN SELECTOR + USD DISPLAY */}
      <AmountAndWallet
        amount={swapAmount}
        setAmount={setSwapAmount}
        openWallet={null}
        showOpenWallet={false}
        showUsdPill={true}
        showRateMessage={false}
        asset={originSymbol}
        assetOptions={formattedTokenOptions}
        setAsset={handleTokenChange}
        showRefund={true}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
      />

      {/* QUOTE PREVIEW DISPLAY (After "Get quote" succeeds) */}
      {quotePreview && !swapStatus && (
        <div className="mt-3 p-4 bg-white rounded-xl border border-gray-800">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">You send</span>
              <span className="text-md font-semibold text-gray-900">
                {quotePreview.amountInFormatted} {quotePreview.fromSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">You receive</span>
              <span className="text-md font-semibold text-gray-900">
                {quotePreview.amountOutFormatted} {quotePreview.toSymbol}
              </span>
            </div>
            {quotePreview.amountOutUsd && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Value</span>
                <span className="text-sm text-gray-600">
                  ≈ ${parseFloat(quotePreview.amountOutUsd).toFixed(2)} USD
                </span>
              </div>
            )}
            {quotePreview.minAmountOut && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Minimum received</span>
                <span className="text-sm text-gray-600">
                  {quotePreview.minAmountOut} {quotePreview.toSymbol}
                </span>
              </div>
            )}
            {quotePreview.timeEstimate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated time</span>
                <span className="text-sm text-gray-600">{quotePreview.timeEstimate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATUS DISPLAY (Polling in progress) */}
      {swapStatus && (
        <div className="mt-3 p-4 bg-white rounded-xl border border-gray-800">
          <div className="space-y-3">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  swapStatus === "SUCCESS" ? "bg-green-500" :
                  swapStatus === "FAILED" ? "bg-red-500" :
                  swapStatus === "REFUNDED" ? "bg-amber-500" :
                  "bg-blue-500 animate-pulse"
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {swapStatus === "SUCCESS" && "✓ Swap Complete"}
                {swapStatus === "FAILED" && "✗ Swap Failed"}
                {swapStatus === "REFUNDED" && "↺ Refunded"}
                {swapStatus === "PENDING_DEPOSIT" && "⏳ Waiting for deposit"}
                {swapStatus === "PROCESSING" && "⚙ Processing"}
                {swapStatus === "INCOMPLETE_DEPOSIT" && "⚠ Incomplete deposit"}
                {!["SUCCESS", "FAILED", "REFUNDED", "PENDING_DEPOSIT", "PROCESSING", "INCOMPLETE_DEPOSIT"].includes(swapStatus) && swapStatus}
              </span>
            </div>

            {/* Status message */}
            {quoteStatus && (
              <p className="text-sm text-gray-600">{quoteStatus}</p>
            )}

            {/* Polling phase indicator */}
            {(pollingState === "initial" || pollingState === "backoff") && (
              <p className="text-xs text-gray-500">
                {pollingState === "initial" ? "Fast checking... (1s intervals)" : "Checking... (5s intervals)"}
              </p>
            )}

            {/* Quote preview still visible during polling */}
            {quotePreview && (
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {quotePreview.amountOutFormatted} {quotePreview.toSymbol}
                  </span>
                </div>
                {quotePreview.amountOutUsd && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Value</span>
                    <span className="text-xs text-gray-600">
                      ≈ ${parseFloat(quotePreview.amountOutUsd).toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SWAP DEPOSIT DISPLAY */}
      <SwapDepositDisplay
        depositUri={depositUri}
        depositAddress={statusKey?.depositAddress}
        amountDecimal={quoteData?.deposit?.amountDecimal}
        originSymbol={originSymbol}
        swapStatus={swapStatus}
        recipientName={recipientName}
      />

      {/* STATUS MESSAGE (Before quote/polling) */}
      {quoteStatus && !quotePreview && !swapStatus && (
        <div className="mt-3 p-3 rounded-xl border border-blue-300 bg-blue-50 text-sm text-blue-700">
          {quoteStatus}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {swapError && (
        <div className="mt-3 p-3 rounded-xl border border-red-300 bg-red-50 text-sm text-red-700">
          {swapError}
        </div>
      )}

      {/* SWAP SETTINGS (Hidden during polling) */}
      {!swapStatus && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-800">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Swap settings</h3>

          {/* Slippage Controls */}
          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-2">Slippage tolerance (%)</label>
            <div className="flex items-center gap-2 flex-wrap">
              {slippageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSlippageChange(option)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                    slippageTolerance === option
                      ? "bg-white border-gray-800 text-gray-900"
                      : "bg-transparent border-gray-300 text-gray-600 hover:border-gray-500"
                  }`}
                >
                  {option}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="text"
                  inputMode="decimal"
                  value={slippageTolerance}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setSlippageTolerance("0.5");
                      return;
                    }
                    if (!/^\d*\.?\d*$/.test(value)) return;
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                      setSlippageTolerance(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (!value || isNaN(parseFloat(value))) {
                      setSlippageTolerance("0.5");
                    }
                  }}
                  placeholder="0.5"
                  className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={!canGetQuote}
              className={`flex-1 px-4 py-3 text-md font-medium border border-gray-800 rounded-xl transition-colors ${
                canGetQuote
                  ? "bg-white text-gray-800 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
              }`}
            >
              {isGettingQuote ? "Getting quote..." : "Get quote"}
            </button>
            <button
              type="button"
              onClick={handleConfirmQuote}
              disabled={!canConfirmQuote}
              className={`flex-1 px-4 py-3 text-md font-medium border border-gray-800 rounded-xl transition-colors ${
                canConfirmQuote
                  ? "bg-white text-gray-800 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
              }`}
            >
              {isConfirming ? "Confirming..." : "Confirm quote"}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center text-sm text-gray-600 italic mt-4 mb-4">
        Complete this transaction using your wallet.{" "}
        <a href="#" className="text-blue-600 hover:text-blue-800 underline not-italic">
          Help
        </a>
      </div>
    </div>
  );
}
