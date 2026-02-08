"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import type { FormEvent, ChangeEvent } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { parseTokenSymbol } from "@/lib/swap/tokenUtils";

// Polling configuration
const POLLING_CONFIG = {
  INTERVAL_MS: 5000, // Poll every 5 seconds
};

type UIStatus = "PENDING_SWAP" | "SWAP_SUCCESS" | "SWAP_FAILED";

// Map API statuses to UI states
const mapToUIState = (apiStatus: string | undefined): UIStatus => {
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
const getFailureReason = (apiStatus: string | undefined): string | null => {
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
const STATUS_COLORS: Record<UIStatus, string> = {
  PENDING_SWAP: "bg-blue-100 text-blue-700",
  SWAP_SUCCESS: "bg-green-100 text-green-700",
  SWAP_FAILED: "bg-red-100 text-red-700",
};

interface StatusKey {
  depositAddress: string;
}

interface SwapData {
  amountInFormatted?: string;
  amountInUsd?: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  minAmountOutFormatted?: string;
  originAsset?: string;
  destinationAsset?: string;
  depositAddress?: string;
  timeEstimate?: number;
  deadline?: string;
  refundTo?: string;
  timestamp?: string;
}

// Input form component
interface SwapStatusFormProps {
  onSubmit: (_key: StatusKey) => void;
  isLoading: boolean;
}

function SwapStatusForm({ onSubmit, isLoading }: SwapStatusFormProps) {
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDepositAddress(e.target.value)}
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
interface TokenIconProps {
  symbol: string;
  size?: number;
}

function TokenIcon({ symbol, size = 32 }: TokenIconProps) {
  const colors: Record<string, string> = {
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
interface SwapStatusDisplayProps {
  statusKey: StatusKey;
  onReset: () => void;
}

function SwapStatusDisplay({ statusKey, onReset }: SwapStatusDisplayProps) {
  const [apiStatus, setApiStatus] = useState<string>("PENDING_DEPOSIT");
  const [error, setError] = useState<string>("");
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Checking swap status...");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const uiStatus = mapToUIState(apiStatus);

  const pollCountRef = useRef<number>(0);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPollRef = useRef<boolean | null>(null);

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
      const quote = result.quoteResponse?.quote || {};

      setSwapData({
        amountInFormatted: swapDetails.amountInFormatted,
        amountInUsd: swapDetails.amountInUsd,
        amountOutFormatted: swapDetails.amountOutFormatted,
        amountOutUsd: swapDetails.amountOutUsd,
        minAmountOutFormatted: quote.amountOutFormatted,
        originAsset: quoteRequest.originAsset,
        destinationAsset: quoteRequest.destinationAsset,
        depositAddress: quote.depositAddress,
        timeEstimate: quote.timeEstimate,
        deadline: quote.deadline,
        refundTo: quoteRequest.refundTo,
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
    } catch (_err) {
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

  const getStatusLabel = (status: UIStatus): string => {
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
      {/* Status */}
      <div className="flex items-center gap-2">
        <h1 className="text-md font-semibold text-gray-800">
          Swap Status
        </h1>
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
          <span>Swap details</span>
          <span className={`transform transition ${detailsOpen ? "rotate-180" : ""}`}>
            ▲
          </span>
        </button>

        {/* Details */}
        {detailsOpen && (
          <div className="border-t border-gray-800 px-4 py-3 space-y-3">
            {/* Failure Reason */}
            {failureReason && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Reason</span>
                <span className="text-xs text-red-700 text-right max-w-xs">
                  {failureReason}
                </span>
              </div>
            )}

            {/* Origin Asset */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-600">Origin Asset</span>
              <code className="text-xs font-mono text-gray-700 text-right">
                {parseTokenSymbol(swapData?.originAsset)} ({swapData?.originAsset})
              </code>
            </div>

            {/* Destination Asset */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-600">Destination Asset</span>
              <code className="text-xs font-mono text-gray-700 text-right">
                {parseTokenSymbol(swapData?.destinationAsset)} ({swapData?.destinationAsset})
              </code>
            </div>

            {/* Deposit Address */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-600">Deposit Address</span>
              <code className="text-xs font-mono text-gray-700 text-right break-all max-w-xs">
                {statusKey.depositAddress}
              </code>
            </div>

            {/* Min Amount Out */}
            {swapData?.minAmountOutFormatted && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Min Amount Out</span>
                <span className="text-xs text-gray-700 text-right">
                  {swapData.minAmountOutFormatted} {parseTokenSymbol(swapData?.destinationAsset)}
                </span>
              </div>
            )}

            {/* Time Estimate */}
            {swapData?.timeEstimate && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Time Estimate</span>
                <span className="text-xs text-gray-700 text-right">
                  {swapData.timeEstimate} seconds
                </span>
              </div>
            )}

            {/* Deadline */}
            {swapData?.deadline && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Deadline</span>
                <span className="text-xs text-gray-700 text-right">
                  {new Date(swapData.deadline).toLocaleString()}
                </span>
              </div>
            )}

            {/* Refund To */}
            {swapData?.refundTo && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-600">Refund To</span>
                <code className="text-xs font-mono text-gray-700 text-right break-all max-w-xs">
                  {swapData.refundTo}
                </code>
              </div>
            )}

            {/* Timestamp */}
            {swapData?.timestamp && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Updated At</span>
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
  const [statusKey, setStatusKey] = useState<StatusKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check for depositAddress in query params on mount
  useEffect(() => {
    const depositAddress = searchParams.get("depositAddress");

    if (depositAddress) {
      setStatusKey({ depositAddress });
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleFormSubmit = (key: StatusKey) => {
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
        {statusKey ? (
          <div className="mb-6">
            <SwapStatusDisplay statusKey={statusKey} onReset={handleReset} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-md font-semibold text-gray-800">
                Swap Status
              </h1>
            </div>
            {/* Main content */}
            <div className="bg-transparent border-none shadow-none p-0">
              <SwapStatusForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
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
