import { QRCodeSVG } from "qrcode.react";
import CopyButton from "@/ui/common/buttons/CopyButton";
import { getSwapUrl } from "@/lib/swap/utils";

interface SwapDepositDisplayProps {
  depositUri: string;
  depositAddress?: string;
  amountDecimal?: string;
  originSymbol: string;
  recipientName?: string;
  receivedAmount?: string;
  receivedSymbol?: string;
  minimumReceived?: string;
  estimatedTime?: string;
  onSentFunds?: () => void;
  onGetNewQuote?: () => void;
}

export default function SwapDepositDisplay({
  depositUri,
  depositAddress,
  amountDecimal,
  originSymbol,
  recipientName,
  receivedAmount,
  receivedSymbol = "ZEC",
  minimumReceived,
  estimatedTime,
  onSentFunds,
  onGetNewQuote,
}: SwapDepositDisplayProps) {
  // Don't render if no deposit address
  if (!depositAddress) return null;

  // Detect payment URI (BTC) vs address-only
  const hasPaymentUri = depositUri?.includes(":");
  const qrValue = hasPaymentUri ? depositUri : depositAddress;

  const handleGoToSwapStatus = () => {
    if (onSentFunds) {
      onSentFunds();
    } else {
      const swapUrl = getSwapUrl({ depositAddress });
      window.open(swapUrl, "_blank");
    }
  };

  return (
    <div className="p-4 animate-fadeIn" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="mb-3 space-y-2 text-center">
        <p className="text-lg font-bold text-gray-900">Send</p>
        <div>
          <div
            className="p-3 rounded-lg border border-gray-800 flex items-center gap-2"
            style={{ backgroundColor: "var(--color-background)" }}
          >
            <p className="text-sm font-mono text-gray-900 break-all flex-1">
              {depositAddress}
            </p>
            <div className="h-6 w-px bg-gray-800/40" aria-hidden="true" />
            <CopyButton
              text={depositAddress}
              label="Copy"
              copiedLabel="Copied"
              expanded
              defaultColorClass="text-gray-900"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-lg font-bold text-gray-900">exactly</span>
          <div
            className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2.5"
            style={{ backgroundColor: "var(--color-background)" }}
          >
            <span className="text-md font-semibold text-gray-900 whitespace-nowrap">
              {amountDecimal ?? "-"} {originSymbol}
            </span>
            <div className="h-5 w-px bg-gray-800/40" aria-hidden="true" />
            <CopyButton
              text={amountDecimal ?? ""}
              label="Copy"
              copiedLabel="Copied"
              expanded
              defaultColorClass="text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 mb-4 mt-1">
        <QRCodeSVG
          value={qrValue}
          size={250}
          includeMargin={true}
          bgColor="var(--color-background)"
          fgColor="#000000"
        />
      </div>

      {/* Final actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onGetNewQuote}
          className="w-full px-4 py-3 border border-gray-800 bg-transparent text-gray-900 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] font-semibold rounded-xl text-md transition-colors"
        >
          Get New Quote
        </button>
        <button
          onClick={handleGoToSwapStatus}
          className="w-full px-4 py-3 bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/90 text-white font-semibold rounded-xl text-md transition-colors"
        >
          I Sent It!
        </button>
      </div>

      <p className="text-sm text-gray-600 mt-4 mb-1 text-center flex flex-wrap items-baseline justify-center gap-x-1">
        <span>{recipientName ?? "Recipient"} receives</span>
        <span className="font-bold whitespace-nowrap">
          {minimumReceived ?? "-"} - {receivedAmount ?? "-"} {receivedSymbol}
        </span>
      </p>
      <p className="text-xs text-gray-500 text-center">
        Estimated time {estimatedTime ?? "Unknown"}
      </p>
    </div>
  );
}
