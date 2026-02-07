"use client";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import { getTokenId } from "@/lib/swap/swapPayload";

export default function SwapComposer({
  profile,
  tokenOptions = [],
  originTokenId,
  originSymbol,
  onSetToken,
  swapAmount,
  onSetSwapAmount,
  refundAddress,
  onSetRefundAddress,
  slippageTolerance,
  onSetSlippageTolerance,
  onGetQuote,
  onConfirmQuote,
  isGettingQuote,
  isConfirming,
  quotePreview,
  quoteStatus,
  onCancelSwapMode,
}) {

  const recipientName = profile?.display_name || profile?.name || "Recipient";

  const canGetQuote = !isGettingQuote && swapAmount && refundAddress && parseFloat(swapAmount) > 0;
  const canConfirmQuote = !isConfirming && quotePreview;

  // Format token options for AmountAndWallet
  const formattedTokenOptions = tokenOptions.map((token) => ({
    id: getTokenId(token),
    symbol: token.symbol || token.ticker || "?",
    chain: token.blockchain || "",
    logo: token.logo || "",
  }));

  const handleTokenChange = (tokenId) => {
    onSetToken(tokenId);
  };

  const slippageOptions = ["0.1", "0.5", "1", "2", "5"];

  const handleSlippageChange = (value) => {
    // Validate slippage: must be between 0 and 100
    const numValue = parseFloat(value);
    if (numValue >= 0 && numValue <= 100) {
      onSetSlippageTolerance(value);
    }
  };

  const handleCustomSlippageChange = (e) => {
    const value = e.target.value;
    // Allow empty string for user to clear and type new value
    if (value === "") {
      onSetSlippageTolerance("0.5"); // Reset to default
      return;
    }
    // Validate: only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;

    const numValue = parseFloat(value);
    // Allow partial input while typing, validate on blur
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onSetSlippageTolerance(value);
    }
  };

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">
      {/* HEADER ROW: Back Button + Recipient */}
      <div className="flex justify-between items-start relative mb-3">
        {/* Left side: Back button */}
        <button
          type="button"
          onClick={onCancelSwapMode}
          className="text-gray-600 hover:text-gray-800 text-xl pt-1 flex-shrink-0"
          aria-label="Go back to ZEC payment"
        >
          ←
        </button>

        {/* Center: Recipient */}
        <div className="text-md font-semibold text-gray-800 whitespace-normal pt-2 flex-1 text-center px-3">
          Send to {" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        {/* Right side: Spacer for balance */}
        <div className="w-6 flex-shrink-0" />
      </div>

      {/* AMOUNT + TOKEN SELECTOR WITH USD PILL */}
      <AmountAndWallet
        amount={swapAmount}
        setAmount={onSetSwapAmount}
        openWallet={null}
        showOpenWallet={false}
        showUsdPill={true}
        showRateMessage={false}
        asset={originSymbol || ""}
        assetOptions={formattedTokenOptions}
        setAsset={handleTokenChange}
        showRefund={true}
        refundAddress={refundAddress}
        setRefundAddress={onSetRefundAddress}
      />

      {/* QUOTE PREVIEW DISPLAY */}
      {quotePreview && (
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

      {/* QUOTE STATUS MESSAGE */}
      {quoteStatus && !quotePreview && (
        <div className="mt-3 p-3 rounded-xl border border-gray-300 bg-blue-50 text-sm text-gray-700">
          {quoteStatus}
        </div>
      )}

      {/* SWAP SETTINGS BOX */}
      <div className="mt-4 p-4 bg-white rounded-xl border border-gray-800">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Swap settings</h3>

        {/* Slippage Tolerance Controls */}
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
                onChange={handleCustomSlippageChange}
                onBlur={(e) => {
                  // Ensure valid value on blur
                  const value = e.target.value.trim();
                  if (!value || isNaN(parseFloat(value))) {
                    onSetSlippageTolerance("0.5");
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
            onClick={onGetQuote}
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
            onClick={onConfirmQuote}
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

      {/* FOOTER */}
      <div className="text-center text-sm text-gray-600 italic mt-4 mb-4">
        Complete this transaction using your wallet. {" "}
        <a href="#" className="text-blue-600 hover:text-blue-800 underline not-italic">
          Help
        </a>
      </div>
    </div>
  );
}
