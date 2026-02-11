import type { SwapQuoteDisplay as SwapQuote } from "@/lib/swap/types";

interface SwapQuoteDisplayProps {
  quote: SwapQuote;
  recipientName?: string;
  showAmounts?: boolean;
  className?: string;
}

export default function SwapQuoteDisplay({
  quote,
  recipientName,
  showAmounts = false,
  className = "",
}: SwapQuoteDisplayProps) {
  return (
    <div
      className={`p-4 rounded-xl border border-gray-800 ${className}`}
      style={{ backgroundColor: "#faf6ed" }}
    >
      <div className="space-y-2">
        {showAmounts && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">You send</span>
              <span className="text-md font-semibold text-gray-900">
                {quote.amountInFormatted} {quote.fromSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {recipientName ? `${recipientName} receives` : "You receive"}
              </span>
              <span className="text-md font-semibold text-gray-900">
                {quote.amountOutFormatted} {quote.toSymbol}
              </span>
            </div>
            {quote.amountOutUsd && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Value</span>
                <span className="text-sm text-gray-600">
                  ≈ ${parseFloat(quote.amountOutUsd.toString()).toFixed(2)} USD
                </span>
              </div>
            )}
          </>
        )}
        {quote.minAmountOut && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {showAmounts ? "Minimum received" : "Min Received"}
            </span>
            <span
              className={`text-gray-${showAmounts ? "600" : "900"} ${
                showAmounts ? "text-sm" : "text-sm font-semibold"
              }`}
            >
              {quote.minAmountOut} {quote.toSymbol}
            </span>
          </div>
        )}
        {quote.timeEstimate && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {showAmounts ? "Estimated time" : "Est. Time"}
            </span>
            <span
              className={`text-gray-${showAmounts ? "600" : "900"} ${
                showAmounts ? "text-sm" : "text-sm font-semibold"
              }`}
            >
              {quote.timeEstimate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
