"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";

// Polling configuration
const POLLING_CONFIG = {
  INITIAL_INTERVAL_MS: 1000,
  MAX_INITIAL_POLLS: 5,
  BACKOFF_INTERVAL_MS: 5000,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 300000,
};

// Status colors for badges
const STATUS_COLORS = {
  PENDING_DEPOSIT: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  INCOMPLETE_DEPOSIT: "bg-yellow-100 text-yellow-700",
};

// Helper functions
function encodeStatusKey(key) {
  return btoa(JSON.stringify(key));
}

function decodeStatusKey(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

// Input form component
function SwapStatusForm({ onSubmit, isLoading }) {
  const [depositAddress, setDepositAddress] = useState("");
  const [depositMemo, setDepositMemo] = useState("");
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
      depositMemo: depositMemo.trim() || undefined,
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

      <div>
        <input
          type="text"
          value={depositMemo}
          onChange={(e) => setDepositMemo(e.target.value)}
          placeholder="Memo (optional)"
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

// Token icon placeholder
function TokenIcon({ symbol, logo, size = 48 }) {
  const colors = {
    ZEC: "bg-yellow-400",
    BTC: "bg-orange-400",
    ETH: "bg-blue-400",
    USDC: "bg-blue-300",
    USDT: "bg-green-400",
    SOL: "bg-purple-400",
  };

  const bgColor = colors[symbol] || "bg-gray-400";

  return (
    <div
      className={`${bgColor} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}

// Status display with new layout
function SwapStatusDisplay({ statusKey, onReset }) {
  const [swapStatus, setSwapStatus] = useState("PENDING_DEPOSIT");
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Checking swap status...");
  const [swapData, setSwapData] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastPollRef = useRef(null);
  const pollRetriesRef = useRef(0);

  // Perform a single poll
  const performPoll = useCallback(async () => {
    if (lastPollRef.current) {
      console.log("[Swap Status] Skipping duplicate poll");
      return;
    }

    if (!statusKey?.depositAddress) {
      console.log("[Swap Status] Invalid status key");
      setError("Invalid swap identifier");
      setIsPolling(false);
      return;
    }

    // Check timeout
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      console.log(`[Swap Status] Elapsed time: ${elapsed}ms`);
      if (elapsed > POLLING_CONFIG.TIMEOUT_MS) {
        console.log("[Swap Status] Timeout reached");
        setError("Swap status check timed out. Please contact support.");
        setIsPolling(false);
        return;
      }
    }

    lastPollRef.current = true;
    console.log(
      `[Swap Status] Performing poll #${pollCountRef.current + 1} for address: ${statusKey.depositAddress.slice(0, 10)}...`
    );

    try {
      const params = new URLSearchParams({
        depositAddress: statusKey.depositAddress,
      });
      if (statusKey.depositMemo) {
        params.append("depositMemo", statusKey.depositMemo);
      }

      const response = await fetch(`/api/swap/status?${params.toString()}`);
      const result = await response.json();
      console.log("[Swap Status] Poll result:", result);

      // Handle API error
      if (result.error) {
        pollRetriesRef.current += 1;
        console.log(
          `[Swap Status] Poll error (retry ${pollRetriesRef.current}/${POLLING_CONFIG.MAX_RETRIES}):`,
          result.error
        );
        if (pollRetriesRef.current > POLLING_CONFIG.MAX_RETRIES) {
          setError(
            "Unable to fetch swap status. Please check your address and try again."
          );
          setIsPolling(false);
        }
        return;
      }

      // Reset retries on successful poll
      pollRetriesRef.current = 0;

      if (!result.status) {
        console.log("[Swap Status] No status in response");
        return;
      }

      const status = result.status.toUpperCase();
      console.log(`[Swap Status] Status updated to: ${status}`);
      setSwapStatus(status);
      setSwapData(result);

      // Handle different statuses
      switch (status) {
        case "PENDING_DEPOSIT":
          setStatusMessage("Waiting for your deposit to arrive...");
          break;
        case "PROCESSING":
          setStatusMessage("Your swap is being processed. This usually takes a few minutes.");
          break;
        case "SUCCESS":
          console.log("[Swap Status] Swap succeeded - stopping polling");
          setStatusMessage("Swap completed successfully!");
          setIsPolling(false);
          break;
        case "FAILED":
          console.log("[Swap Status] Swap failed - stopping polling");
          setStatusMessage("Swap failed.");
          setIsPolling(false);
          break;
        case "REFUNDED":
          console.log("[Swap Status] Swap refunded - stopping polling");
          setStatusMessage("Swap was refunded to your address.");
          setIsPolling(false);
          break;
        case "INCOMPLETE_DEPOSIT":
          setStatusMessage("Deposit received but incomplete.");
          break;
        default:
          setStatusMessage(`Status: ${status}`);
      }
    } catch (err) {
      console.error("[Swap Status] Unexpected poll error:", err);
      pollRetriesRef.current += 1;
      if (pollRetriesRef.current > POLLING_CONFIG.MAX_RETRIES) {
        setError("Connection error. Please refresh and try again.");
        setIsPolling(false);
      }
    } finally {
      lastPollRef.current = null;
    }
  }, [statusKey]);

  // Start polling on mount
  useEffect(() => {
    if (!statusKey?.depositAddress) {
      console.log("[Swap Status] Invalid swap identifier on mount");
      setError("Invalid swap identifier");
      return;
    }

    console.log("[Swap Status] Starting polling");
    startTimeRef.current = Date.now();
    pollCountRef.current = 0;
    pollRetriesRef.current = 0;

    // Perform first poll immediately
    performPoll();
    pollCountRef.current += 1;

    // Setup interval
    const setupInterval = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const isInitialPhase =
        pollCountRef.current < POLLING_CONFIG.MAX_INITIAL_POLLS;
      const interval = isInitialPhase
        ? POLLING_CONFIG.INITIAL_INTERVAL_MS
        : POLLING_CONFIG.BACKOFF_INTERVAL_MS;

      console.log(
        `[Swap Status] Setting up interval: ${interval}ms (initial: ${isInitialPhase})`
      );

      pollIntervalRef.current = setInterval(() => {
        if (isPolling) {
          pollCountRef.current += 1;
          performPoll();
        }
      }, interval);
    };

    setupInterval();

    return () => {
      console.log("[Swap Status] Cleaning up polling");
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [statusKey, isPolling, performPoll]);

  const statusColor = STATUS_COLORS[swapStatus] || STATUS_COLORS.PENDING_DEPOSIT;

  return (
    <div className="space-y-6">
      {/* Token swap display */}
      <div className="flex flex-col items-center gap-4">
        {/* Token icons */}
        <div className="flex items-center gap-4">
          <TokenIcon symbol="ZEC" size={56} />
          <div className="text-2xl text-gray-800">↑</div>
          <TokenIcon symbol="BTC" size={56} />
        </div>

        {/* Label */}
        <p className="text-sm text-gray-600">Swapped</p>

        {/* Main amount */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            {swapData?.amountOutFormatted || "—"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">ZEC</p>
        </div>
      </div>

      {/* Exchange boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Input */}
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Sent</p>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {swapData?.amountInFormatted || "—"}
          </p>
          <p className="text-xs text-gray-600">
            {swapData?.amountInUsd ? `$${swapData.amountInUsd}` : "—"}
          </p>
        </div>

        {/* Output */}
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Received</p>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {swapData?.amountOutFormatted || "—"}
          </p>
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
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                {swapStatus}
              </span>
            </div>

            {/* Deposit Address */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-600">Deposit Address</span>
              <code className="text-xs font-mono text-gray-700 text-right break-all max-w-xs">
                {statusKey.depositAddress}
              </code>
            </div>

            {/* Memo */}
            {statusKey.depositMemo && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Memo</span>
                <code className="text-xs font-mono text-gray-700">
                  {statusKey.depositMemo}
                </code>
              </div>
            )}

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

      {/* Polling indicator */}
      {isPolling && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 py-3">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 bg-gray-800 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-800 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-800 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
          <span>Polling for updates...</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-50 text-md"
        >
          Another Swap
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

// Main page component
export default function SwapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusKey, setStatusKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for txId in query params on mount
  useEffect(() => {
    const txId = searchParams.get("txId");
    if (txId) {
      const decoded = decodeStatusKey(txId);
      if (decoded?.depositAddress) {
        console.log("[Swap Status] Decoded status key from URL:", decoded);
        setStatusKey(decoded);
        setIsLoading(false);
      }
    }
  }, [searchParams]);

  const handleFormSubmit = (key) => {
    console.log("[Swap Status] Form submitted with key:", key);
    setIsLoading(true);
    const encoded = encodeStatusKey(key);
    router.push(`/swap?txId=${encoded}`);
  };

  const handleReset = () => {
    console.log("[Swap Status] Resetting to form");
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
