"use client";
import { useCallback, useContext } from "react";
import { SwapContext } from "@/app/[slug]/providers/swap-provider";
import CopyButton from "@/ui/profile/CopyButton";

// Swap Composer Component - UI for swap functionality
export default function SwapComposer({
  profile,
  amount,
  onGetQuote,
  onConfirmQuote,
  className = ""
}) {
  const {
    refundAddress,
    slippageTolerance,
    quotePreview,
    quoteStatus,
    depositUri,
    swapStatus,
    isConfirming,
    isGettingQuote,
    swapError,
    isSwapMode,
    setRefundAddress,
    setSlippageTolerance,
    getQuote,
    confirmSwap,
    cancelSwapMode,
  } = useContext(SwapContext);

  // Get quote handler
  const handleGetQuote = useCallback(async () => {
    if (!isSwapMode) return;
    try {
      const result = await getQuote({
        amount,
        destAddress: profile?.address,
        refund: refundAddress,
        slippage: slippageTolerance,
      });
      if (onGetQuote) onGetQuote(result);
    } catch (error) {
      // Error already handled in getQuote
    }
  }, [isSwapMode, amount, profile?.address, refundAddress, slippageTolerance, getQuote, onGetQuote]);

  // Confirm quote handler
  const handleConfirmQuote = useCallback(async () => {
    if (!isSwapMode || !quotePreview) return;
    try {
      const result = await confirmSwap({
        amount,
        destAddress: profile?.address,
        refund: refundAddress,
        slippage: slippageTolerance,
      });
      if (onConfirmQuote) onConfirmQuote(result);
    } catch (error) {
      // Error already handled in confirmSwap
    }
  }, [isSwapMode, quotePreview, amount, profile?.address, refundAddress, slippageTolerance, confirmSwap, onConfirmQuote]);

  // Don't render if not in swap mode
  if (!isSwapMode) {
    return null;
  }

  return (
    <div className={className}>
      {/* Swap Settings */}
      <div className="mb-4 p-3 rounded-lg border border-gray-300 bg-gray-50">
        {/* Slippage Tolerance */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Slippage Tolerance (%)
        </label>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["0.1", "0.5", "1", "2"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSlippageTolerance(value)}
                className={`px-3 py-1 text-sm border rounded-lg transition-colors whitespace-nowrap ${
                  slippageTolerance === value
                    ? "bg-blue-50 text-blue-700 border-blue-300 font-semibold"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={slippageTolerance}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                  setSlippageTolerance(val);
                }
              }}
              className="w-20 border border-gray-300 px-3 py-1 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        {/* Get Quote / Confirm Quote Buttons */}
        <div className="flex flex-col min-[480px]:flex-row gap-3">
          <button
            type="button"
            onClick={handleGetQuote}
            disabled={isGettingQuote || !amount || !refundAddress || parseFloat(amount) <= 0}
            className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
              isGettingQuote || !amount || !refundAddress || parseFloat(amount) <= 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            {isGettingQuote ? "Getting quote..." : "Get quote"}
          </button>
          <button
            type="button"
            onClick={handleConfirmQuote}
            disabled={!quotePreview || isConfirming}
            className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
              !quotePreview || isConfirming
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            {isConfirming ? "Confirming..." : "Confirm quote"}
          </button>
        </div>
      </div>

      {/* Swap Status Display */}
      {(quoteStatus || swapError) && (
        <div className={`mb-4 p-3 rounded-lg border ${
          swapError
            ? "bg-red-50 border-red-200"
            : swapStatus === "SUCCESS"
            ? "bg-green-50 border-green-200"
            : swapStatus === "FAILED" || swapStatus === "REFUNDED"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <div className={`text-sm ${
            swapError
              ? "text-red-700"
              : swapStatus === "SUCCESS"
              ? "text-green-700"
              : swapStatus === "FAILED" || swapStatus === "REFUNDED"
              ? "text-yellow-700"
              : "text-blue-700"
          }`}>
            {swapError || quoteStatus}
            {isConfirming && (
              <span className="ml-2 inline-block animate-spin">⏳</span>
            )}
          </div>
        </div>
      )}

      {/* Cancel Swap Button */}
      {!isConfirming && (
        <button
          onClick={cancelSwapMode}
          className="mb-3 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to ZEC payment
        </button>
      )}
    </div>
  );
}

// SwapRecipientInfo - Display recipient ZEC address for confirmed swaps
export function SwapRecipientInfo({ profile }) {
  const { depositUri, originSymbol, isSwapMode } = useContext(SwapContext);

  if (!isSwapMode || !depositUri || !profile?.address) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-xs text-gray-600 mb-2 font-medium">
        Recipient will receive ZEC at:
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono flex-1 break-all text-gray-800">
          {profile.address}
        </code>
        <CopyButton text={profile.address} />
      </div>
      <div className="text-xs text-gray-500 mt-2 italic">
        After you send {originSymbol} to the address above, it will be automatically swapped to ZEC and delivered to this address.
      </div>
    </div>
  );
}
