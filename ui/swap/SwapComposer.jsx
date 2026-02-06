"use client";
import { useMemo } from "react";
import CopyButton from "@/ui/profile/CopyButton";

export function SwapSettings({
  slippageTolerance,
  onSetSlippageTolerance,
  onGetQuote,
  onConfirmQuote,
  isGettingQuote,
  isConfirming,
  amount,
  refundAddress,
  quotePreview,
}) {
  const canGetQuote = !isGettingQuote && amount && refundAddress && parseFloat(amount) > 0;
  const canConfirmQuote = !isConfirming && quotePreview;

  return (
    <div className="mb-4 p-3 rounded-lg border border-gray-800 overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Slippage (%)
      </label>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {["0.1", "0.5", "1", "2"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSetSlippageTolerance(value)}
              className={`px-3 py-1 text-sm border border-gray-800 rounded-lg transition-colors whitespace-nowrap ${
                slippageTolerance === value
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "bg-white text-gray-700 hover:bg-gray-50"
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
                onSetSlippageTolerance(val);
              }
            }}
            className="w-20 border border-gray-800 px-3 py-1 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-gray-600">%</span>
        </div>
      </div>

      <div className="flex flex-col min-[480px]:flex-row gap-3">
        <button
          type="button"
          onClick={onGetQuote}
          disabled={!canGetQuote}
          className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
            canGetQuote
              ? "bg-white text-gray-800 hover:bg-gray-50"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isGettingQuote ? "Getting quote..." : "Get quote"}
        </button>
        <button
          type="button"
          onClick={onConfirmQuote}
          disabled={!canConfirmQuote}
          className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
            canConfirmQuote
              ? "bg-white text-gray-800 hover:bg-gray-50"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isConfirming ? "Confirming..." : "Confirm quote"}
        </button>
      </div>
    </div>
  );
}

export function SwapStatusDisplay({
  quoteStatus,
  swapError,
  swapStatus,
  isConfirming,
}) {
  if (!quoteStatus && !swapError) return null;

  return (
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
  );
}

export function SwapTokenSelector({
  tokenOptions,
  originTokenId,
  originSymbol,
  onSetToken,
}) {
  const selectedToken = useMemo(() => {
    return tokenOptions.find((t) => (t.id || t.assetId) === originTokenId);
  }, [tokenOptions, originTokenId]);

  return (
    <div className="mb-4 p-3 rounded-lg border border-gray-800 overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Swap from token
      </label>
      <select
        value={originTokenId || ""}
        onChange={(e) => onSetToken(e.target.value)}
        className="w-full border border-gray-800 px-3 py-2 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">Select a token to swap from</option>
        {tokenOptions.map((token) => (
          <option key={token.id || token.assetId} value={token.id || token.assetId}>
            {token.symbol || token.ticker || ""} - {token.blockchain || ""}
          </option>
        ))}
      </select>
      {selectedToken && (
        <div className="mt-2 text-xs text-gray-600">
          Selected: {selectedToken.symbol || selectedToken.ticker || ""} on {selectedToken.blockchain || ""}
        </div>
      )}
    </div>
  );
}

export function SwapRefundAddress({
  refundAddress,
  onSetRefundAddress,
  tokenBlockchain,
}) {
  return (
    <div className="mb-4 p-3 rounded-lg border border-gray-800 overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Refund address ({tokenBlockchain || "token"})
      </label>
      <input
        type="text"
        value={refundAddress}
        onChange={(e) => onSetRefundAddress(e.target.value)}
        placeholder={`Enter your ${tokenBlockchain || "token"} address for refunds`}
        className="w-full border border-gray-800 px-3 py-2 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
      {refundAddress && (
        <div className="mt-2 text-xs text-gray-600 break-all">
          {refundAddress}
        </div>
      )}
    </div>
  );
}

export function SwapRecipientInfo({ profile, originSymbol, depositUri }) {
  if (!depositUri || !profile?.address) return null;

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
