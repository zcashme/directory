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

      {/* QUOTE STATUS MESSAGE */}
      {quoteStatus && (
        <div className="mt-3 p-3 rounded-xl border border-gray-300 bg-blue-50 text-sm text-gray-700">
          {quoteStatus}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onGetQuote}
          disabled={!canGetQuote}
          className={`w-full px-4 py-3 text-md font-medium border border-black rounded-xl transition-colors ${
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
          className={`w-full px-4 py-3 text-md font-medium border border-black rounded-xl transition-colors ${
            canConfirmQuote
              ? "bg-white text-gray-800 hover:bg-gray-50"
              : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
          }`}
        >
          {isConfirming ? "Confirming..." : "Confirm quote"}
        </button>
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
