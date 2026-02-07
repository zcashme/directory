"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { parseTokenSymbol } from "@/lib/swap/tokenUtils";

// Polling configuration
const POLLING_CONFIG = {
  INTERVAL_MS: 5000, // Poll every 5 seconds
};

// Map API statuses to UI states
const mapToUIState = (apiStatus) => {
  const status = apiStatus?.toUpperCase();

  // Pending states
  if (status === "PENDING_DEPOSIT" || status === "PROCESSING") {
    return "PENDING_SWAP";
  }

  // Success state
  if (status === "SUCCESS") {
    return "SWAP_SUCCESS";
  }

  // Failed states
  if (status === "INCOMPLETE_DEPOSIT" || status === "REFUNDED" || status === "FAILED") {
    return "SWAP_FAILED";
  }

  return "PENDING_SWAP"; // Default to pending
};

// Get failure reason
const getFailureReason = (apiStatus) => {
  const status = apiStatus?.toUpperCase();

  if (status === "INCOMPLETE_DEPOSIT") {
    return "Deposit was below the required amount";
  }
  if (status === "REFUNDED") {
    return "Funds were refunded to your address";
  }
  if (status === "FAILED") {
    return "Swap encountered an error";
  }

  return null;
};

// Status colors for badges
const STATUS_COLORS = {
  PENDING_SWAP: "bg-blue-100 text-blue-700",
  SWAP_SUCCESS: "bg-green-100 text-green-700",
  SWAP_FAILED: "bg-red-100 text-red-700",
};


// Input form component
function SwapStatusForm({ onSubmit, isLoading }) {
  const [depositAddress, setDepositAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!depositAddress.trim()) {
      setError("Deposit address is required");
      return;
    }

    onSubmit({
      depositAddress: depositAddress.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          value={depositAddress}
          onChange={(e) => setDepositAddress(e.target.value)}
          placeholder="Deposit address"
          className="w-full border border-gray-800 px-3 py-2 rounded-xl text-md text-gray-700 focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full border border-gray-800 px-4 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 text-md"
      >
        {isLoading ? "Checking..." : "Check Status"}
      </button>
    </form>
  );
}

// Token icon component
function TokenIcon({ symbol, size = 32 }) {
  const colors = {
    ZEC: "bg-yellow-400",
    BTC: "bg-orange-400",
    ETH: "bg-blue-400",
    USDC: "bg-blue-300",
    USDT: "bg-green-400",
    SOL: "bg-purple-400",
    ARB: "bg-blue-500",
    NEAR: "bg-gray-700",
  };

  const bgColor = colors[symbol] || "bg-gray-400";

  return (
    <div
      className={`${bgColor} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol ? symbol.slice(0, 1) : "?"}
    </div>
  );
}

// Status display with new layout
function SwapStatusDisplay({ statusKey, onReset }) {
  const [apiStatus, setApiStatus] = useState("PENDING_DEPOSIT");
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Checking swap status...");
  const [failureReason, setFailureReason] = useState(null);
  const [swapData, setSwapData] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const uiStatus = mapToUIState(apiStatus);

  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const lastPollRef = useRef(null);

  // Perform a single poll
  const performPoll = useCallback(async () => {
    if (lastPollRef.current) {
      return;
    }

    if (!statusKey?.depositAddress) {
      setError("Invalid swap identifier");
      setIsPolling(false);
      return;
    }

    lastPollRef.current = true;

    try {
      const params = new URLSearchParams({
        depositAddress: statusKey.depositAddress,
      });

      const response = await fetch(`/api/swap/status?${params.toString()}`);
      const result = await response.json();

      // Handle API error
      if (result.error) {
        setError("Unable to fetch swap status. Retrying...");
        return;
      }

      // Clear error on successful poll
      setError("");

      if (!result.status) {
        return;
      }

      const status = result.status.toUpperCase();
      setApiStatus(status);

      // Extract and flatten relevant data
      const swapDetails = result.swapDetails || {};
      const quoteRequest = result.quoteResponse?.quoteRequest || {};

      setSwapData({
        amountInFormatted: swapDetails.amountInFormatted,
        amountInUsd: swapDetails.amountInUsd,
        amountOutFormatted: swapDetails.amountOutFormatted,
        amountOutUsd: swapDetails.amountOutUsd,
        originAsset: quoteRequest.originAsset,
        destinationAsset: quoteRequest.destinationAsset,
        timestamp: result.updatedAt,
      });

      // Map to UI state and handle accordingly
      const mappedStatus = mapToUIState(status);

      switch (mappedStatus) {
        case "PENDING_SWAP":
          setStatusMessage("Your swap is pending. This usually takes a few minutes.");
          setFailureReason(null);
          break;
        case "SWAP_SUCCESS":
          setStatusMessage("Swap completed successfully!");
          setFailureReason(null);
          setIsPolling(false);
          break;
        case "SWAP_FAILED":
          setStatusMessage("Swap failed.");
          setFailureReason(getFailureReason(status));
          setIsPolling(false);
          break;
        default:
          setStatusMessage("Checking swap status...");
          setFailureReason(null);
      }
    } catch (err) {
      setError("Connection error. Retrying...");
    } finally {
      lastPollRef.current = null;
    }
  }, [statusKey]);

  // Start polling on mount
  useEffect(() => {
    if (!statusKey?.depositAddress) {
      setError("Invalid swap identifier");
      return;
    }

    pollCountRef.current = 0;

    // Perform first poll immediately
    performPoll();
    pollCountRef.current += 1;

    // Setup interval - poll every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      if (isPolling) {
        pollCountRef.current += 1;
        performPoll();
      }
    }, POLLING_CONFIG.INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [statusKey, isPolling, performPoll]);

  const statusColor = STATUS_COLORS[uiStatus] || STATUS_COLORS.PENDING_SWAP;

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING_SWAP":
        return "Pending Swap";
      case "SWAP_SUCCESS":
        return "Swap Success";
      case "SWAP_FAILED":
        return "Swap Failed";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Exchange boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Input */}
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Sent</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={parseTokenSymbol(swapData?.originAsset)} size={24} />
            <p className="text-lg font-semibold text-gray-800">
              {swapData?.amountInFormatted || "—"}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            {swapData?.amountInUsd ? `$${swapData.amountInUsd}` : "—"}
          </p>
        </div>

        {/* Output */}
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Received</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={parseTokenSymbol(swapData?.destinationAsset)} size={24} />
            <p className="text-lg font-semibold text-gray-800">
              {swapData?.amountOutFormatted || "—"}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            {swapData?.amountOutUsd ? `$${swapData.amountOutUsd}` : "—"}
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 font-semibold text-gray-800"
        >
          <span>Transaction Details</span>
          <span className={`transform transition ${detailsOpen ? "rotate-180" : ""}`}>
            ▲
          </span>
        </button>

        {/* Details */}
        {detailsOpen && (
          <div className="border-t border-gray-800 px-4 py-3 space-y-3">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                  {getStatusLabel(uiStatus)}
                </span>
                {/* Polling indicator */}
                {isPolling && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <div
                        className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                        style={{ animationDelay: "0s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">Polling...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Failure Reason */}
            {failureReason && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Reason</span>
                <span className="text-xs text-red-700 text-right max-w-xs">
                  {failureReason}
                </span>
              </div>
            )}

            {/* Deposit Address */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-600">Deposit Address</span>
              <code className="text-xs font-mono text-gray-700 text-right break-all max-w-xs">
                {statusKey.depositAddress}
              </code>
            </div>

            {/* Timestamp */}
            {swapData?.timestamp && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Timestamp</span>
                <span className="text-xs text-gray-700">
                  {new Date(swapData.timestamp).toLocaleString()}
                </span>
              </div>
            )}

            {/* Message */}
            {statusMessage && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Message</span>
                <span className="text-xs text-gray-700 text-right">
                  {statusMessage}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-red-600 text-sm border border-red-300 rounded-xl p-3 bg-red-50">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-50 text-md"
        >
          Check Another Swap
        </button>
        <button
          onClick={() =>
            navigator.clipboard.writeText(window.location.href)
          }
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-50 text-md"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}

// Main page component content
function SwapPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusKey, setStatusKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for depositAddress in query params on mount
  useEffect(() => {
    const depositAddress = searchParams.get("depositAddress");

    if (depositAddress) {
      setStatusKey({ depositAddress });
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleFormSubmit = (key) => {
    setIsLoading(true);
    router.push(`/swap?depositAddress=${encodeURIComponent(key.depositAddress)}`);
  };

  const handleReset = () => {
    setStatusKey(null);
    router.push("/swap");
  };

  return (
    <>
      <ProfileHeader />
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-md font-semibold text-gray-800">
            Swap Status
          </h1>
        </div>

        {/* Main content */}
        <div className="bg-transparent border-none shadow-none p-0">
          {statusKey ? (
            <SwapStatusDisplay statusKey={statusKey} onReset={handleReset} />
          ) : (
            <SwapStatusForm
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
      </div>
    </>
  );
}

// Wrapper with Suspense boundary
export default function SwapPage() {
  return (
    <Suspense fallback={
      <>
        <ProfileHeader />
        <div
          className="min-h-screen p-4 md:p-8"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-md font-semibold text-gray-800">
                Swap Status
              </h1>
            </div>
            <div className="text-center text-gray-600">Loading...</div>
          </div>
        </div>
      </>
    }>
      <SwapPageContent />
    </Suspense>
  );
}
