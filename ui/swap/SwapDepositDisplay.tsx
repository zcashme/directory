import { QRCodeSVG } from "qrcode.react";
import CopyButton from "@/ui/common/buttons/CopyButton";
import { getSwapUrl } from "@/lib/swap/utils";

interface SwapDepositDisplayProps {
  depositUri: string;
  depositAddress?: string;
  amountDecimal?: string;
  originSymbol: string;
  onSentFunds?: () => void;
}

export default function SwapDepositDisplay({
  depositUri,
  depositAddress,
  amountDecimal,
  originSymbol,
  onSentFunds,
}: SwapDepositDisplayProps) {

  // Don't render if no deposit address
  if (!depositAddress) return null;

  // Detect payment URI (BTC) vs address-only
  const hasPaymentUri = depositUri?.includes(':');
  const qrValue = hasPaymentUri ? depositUri : depositAddress;

  const handleGoToSwapStatus = () => {
    if (onSentFunds) {
      onSentFunds();
    } else {
      const swapUrl = getSwapUrl({ depositAddress });
      window.open(swapUrl, '_blank');
    }
  };


  return (
    <div className="mt-3 p-4 rounded-xl border border-gray-800 animate-fadeIn" style={{ backgroundColor: '#faf6ed' }}>
      <h3 className="text-md font-semibold text-gray-900 mb-3">
        Deposit {originSymbol} to Complete Swap
      </h3>

      {/* Amount to send */}
      <div className="mb-4 p-3 rounded-lg border border-gray-800" style={{ backgroundColor: '#faf6ed' }}>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Send exactly:</span>
          <span className="text-lg font-bold text-gray-900">
            {amountDecimal} {originSymbol}
          </span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <QRCodeSVG
          value={qrValue}
          size={250}
          includeMargin={true}
          bgColor="#faf6ed"
          fgColor="#000000"
        />
      </div>

      {/* Address display */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">Deposit address:</label>
        <div className="p-3 rounded-lg border border-gray-800 flex items-center gap-2" style={{ backgroundColor: '#faf6ed' }}>
          <p className="text-sm font-mono text-gray-900 break-all flex-1">
            {depositAddress}
          </p>
          <CopyButton text={depositAddress} label="Copy" copiedLabel="Copied" />
        </div>
      </div>

      {/* Primary action: I've Sent Funds */}
      <div>
        <button
          onClick={handleGoToSwapStatus}
          className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-md transition-colors"
        >
          I've Sent Funds
        </button>
      </div>
    </div>
  );
}
