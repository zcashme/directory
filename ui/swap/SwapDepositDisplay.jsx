import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Helper to encode status key to query param
function encodeStatusKey(key) {
  return btoa(JSON.stringify(key));
}

export default function SwapDepositDisplay({
  depositUri,
  depositAddress,
  depositMemo,
  amountDecimal,
  originSymbol,
  swapStatus,
  recipientName,
}) {
  const router = useRouter();
  const qrRef = useRef(null);
  const [showQR, setShowQR] = useState(true);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Don't render if no deposit address
  if (!depositAddress) return null;

  // Only show for active swap statuses
  const activeStatuses = ['PENDING_DEPOSIT', 'PROCESSING', 'INCOMPLETE_DEPOSIT'];
  if (!swapStatus || !activeStatuses.includes(swapStatus)) return null;

  // Detect if this chain needs a memo/tag
  const memoChains = ['XRP', 'XLM', 'EOS', 'BNB'];
  const needsMemo = depositMemo && memoChains.includes(originSymbol?.toUpperCase());
  const memoLabel = originSymbol?.toUpperCase() === 'XRP' ? 'tag' : 'memo';

  // Detect payment URI (BTC) vs address-only
  const hasPaymentUri = depositUri?.includes(':');
  const qrValue = hasPaymentUri ? depositUri : depositAddress;

  // Truncate address for display
  const truncatedAddress = depositAddress.length > 20
    ? `${depositAddress.slice(0, 8)}...${depositAddress.slice(-6)}`
    : depositAddress;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyStatusLink = () => {
    const statusKey = {
      depositAddress,
      ...(depositMemo && { depositMemo }),
    };
    const encoded = encodeStatusKey(statusKey);
    const statusUrl = `${window.location.origin}/swap?txId=${encoded}`;
    navigator.clipboard.writeText(statusUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleFundsSent = () => {
    const statusKey = {
      depositAddress,
      ...(depositMemo && { depositMemo }),
    };
    const encoded = encodeStatusKey(statusKey);
    router.push(`/swap?txId=${encoded}`);
  };

  const handleSaveQR = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const clone = svg.cloneNode(true);
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeName = (recipientName || "recipient")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    link.download = `zcashme-${safeName}-swap-deposit-qr.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const actionButtonClasses =
    "flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-blue-500 hover:border-blue-600 text-blue-700 whitespace-nowrap";
  const hideButtonClasses =
    "flex items-center gap-1 px-3 pl-0 py-2 text-md transition-all duration-200 text-blue-600 hover:text-blue-700 whitespace-nowrap";

  return (
    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-300 animate-fadeIn">
      <h3 className="text-md font-semibold text-gray-900 mb-3">
        Deposit {originSymbol} to Complete Swap
      </h3>

      {/* Memo/tag warning banner */}
      {needsMemo && (
        <div className="mb-4 bg-amber-100 border border-amber-500 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 mb-1">
                IMPORTANT: Include destination {memoLabel}
              </p>
              <p className="text-sm text-amber-800">
                {memoLabel.charAt(0).toUpperCase() + memoLabel.slice(1)}: <span className="font-mono font-semibold">{depositMemo}</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your swap will fail if you don't include the {memoLabel}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Amount to send */}
      <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Send exactly:</span>
          <span className="text-lg font-bold text-blue-700">
            {amountDecimal} {originSymbol}
          </span>
        </div>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="flex flex-col items-center gap-2 mb-4">
          <QRCodeSVG
            ref={qrRef}
            value={qrValue}
            size={250}
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      )}

      {/* Address display */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">Deposit address:</label>
        <div className="p-3 bg-white rounded-lg border border-blue-200">
          <p className="text-sm font-mono text-gray-900 break-all">
            {showFullAddress ? depositAddress : truncatedAddress}
          </p>
        </div>
      </div>

      {/* Primary action: I've Sent Funds */}
      <div className="mb-4">
        <button
          onClick={handleFundsSent}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-md transition-colors"
        >
          I've Sent Funds
        </button>
      </div>

      {/* Secondary action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {/* QR controls */}
        {showQR ? (
          <div className="flex items-center gap-0">
            <button
              onClick={handleSaveQR}
              className={actionButtonClasses}
            >
              {saved ? "Saved" : "Save QR"}
            </button>
            <button
              onClick={() => setShowQR(false)}
              className={hideButtonClasses}
            >
              —Hide
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowQR(true)}
            className={actionButtonClasses}
          >
            Show QR
          </button>
        )}

        {/* Copy address */}
        <button
          onClick={handleCopyAddress}
          className={actionButtonClasses}
        >
          {copied ? "Copied" : "Copy Address"}
        </button>

        {/* Show/hide full address */}
        {depositAddress.length > 20 && (
          showFullAddress ? (
            <button
              onClick={() => setShowFullAddress(false)}
              className={hideButtonClasses}
            >
              Hide Full
            </button>
          ) : (
            <button
              onClick={() => setShowFullAddress(true)}
              className={actionButtonClasses}
            >
              Show Full
            </button>
          )
        )}

        {/* Share status link */}
        <button
          onClick={handleCopyStatusLink}
          className={actionButtonClasses}
        >
          {linkCopied ? "Link Copied" : "Share Status"}
        </button>
      </div>
    </div>
  );
}
