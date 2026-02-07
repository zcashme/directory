import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { submitDepositTxHash } from "@/lib/swap/depositAction";

// Helper to encode status key to query param
function encodeStatusKey(key) {
  return btoa(JSON.stringify(key));
}

export default function SwapDepositDisplay({
  depositUri,
  depositAddress,
  amountDecimal,
  originSymbol,
  swapStatus,
  recipientName,
}) {
  const qrRef = useRef(null);
  const [showQR, setShowQR] = useState(true);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showTxHashModal, setShowTxHashModal] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isSubmittingTxHash, setIsSubmittingTxHash] = useState(false);
  const [txHashError, setTxHashError] = useState("");
  const [txHashSuccess, setTxHashSuccess] = useState(false);

  // Don't render if no deposit address
  if (!depositAddress) return null;

  // Only show for active swap statuses
  const activeStatuses = ['PENDING_DEPOSIT', 'PROCESSING', 'INCOMPLETE_DEPOSIT'];
  if (!swapStatus || !activeStatuses.includes(swapStatus)) return null;

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
    };
    const encoded = encodeStatusKey(statusKey);
    const statusUrl = `${window.location.origin}/swap?txId=${encoded}`;
    navigator.clipboard.writeText(statusUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleOpenTxHashModal = () => {
    setTxHash("");
    setTxHashError("");
    setShowTxHashModal(true);
  };

  const handleSubmitTxHash = async () => {
    if (!txHash.trim()) {
      setTxHashError("Please enter a transaction hash");
      return;
    }

    setIsSubmittingTxHash(true);
    setTxHashError("");

    try {
      const result = await submitDepositTxHash({
        txHash: txHash.trim(),
        depositAddress,
      });

      if (!result.ok) {
        setTxHashError(result.error || "Failed to submit transaction hash");
        return;
      }

      // Success - show message and close modal after delay
      setTxHashSuccess(true);
      setTxHash("");

      setTimeout(() => {
        setShowTxHashModal(false);
        setTxHashSuccess(false);
      }, 2000);
    } catch (error) {
      setTxHashError(error.message || "An error occurred");
    } finally {
      setIsSubmittingTxHash(false);
    }
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
          onClick={handleOpenTxHashModal}
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

      {/* Transaction Hash Modal */}
      {showTxHashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            {txHashSuccess ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Transaction Received</h2>
                <p className="text-sm text-gray-600">
                  Your transaction hash has been submitted. Swap processing will be accelerated.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Transaction</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Paste your transaction hash to speed up processing (optional)
                </p>

                <input
                  type="text"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => {
                    setTxHash(e.target.value);
                    setTxHashError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {txHashError && (
                  <p className="text-sm text-red-600 mb-4">{txHashError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTxHashModal(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmitTxHash}
                    disabled={!txHash.trim() || isSubmittingTxHash}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSubmittingTxHash ? "Submitting..." : "I've Sent Funds"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
