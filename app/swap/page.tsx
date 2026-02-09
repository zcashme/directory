"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import type { FormEvent, ChangeEvent } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { parseTokenSymbol } from "@/lib/swap/tokenUtils";
import { useSwapStore } from "@/lib/stores/swap";

type UIStatus = "PENDING_SWAP" | "SWAP_SUCCESS" | "SWAP_FAILED";

// Status colors for badges
const STATUS_COLORS: Record<UIStatus, string> = {
  PENDING_SWAP: "bg-blue-100 text-blue-700",
  SWAP_SUCCESS: "bg-green-100 text-green-700",
  SWAP_FAILED: "bg-red-100 text-red-700",
};

// Input form component
interface SwapStatusFormProps {
  onSubmit: (_depositAddress: string) => void;
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

    onSubmit(depositAddress.trim());
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
  depositAddress: string;
  onReset: () => void;
}

function SwapStatusDisplay({ depositAddress, onReset }: SwapStatusDisplayProps) {
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  // Get state from store
  const {
    isPolling,
    uiStatus,
    apiStatus,
    statusMessage,
    failureReason,
    swapData,
    statusError,
    startPolling,
    stopPolling,
  } = useSwapStore();

  // Start polling on mount, stop on unmount
  useEffect(() => {
    startPolling(depositAddress);
    return () => stopPolling();
  }, [depositAddress, startPolling, stopPolling]);

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
            <span className="text-xs text-gray-600">
              {apiStatus?.toUpperCase() === "PENDING_DEPOSIT" ? "Receiving" : "Swapping"}
            </span>
          </div>
        )}
      </div>

      {/* Exchange boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Input */}
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Sent</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={parseTokenSymbol(swapData?.originAsset) || ""} size={24} />
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
            <TokenIcon symbol={parseTokenSymbol(swapData?.destinationAsset) || ""} size={24} />
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
                {depositAddress}
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
      {statusError && (
        <div className="text-red-600 text-sm border border-red-300 rounded-xl p-3 bg-red-50">
          {statusError}
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
  const resetStatusState = useSwapStore((state) => state.resetStatusState);

  const depositAddress = searchParams.get("depositAddress");

  const handleFormSubmit = (address: string) => {
    router.push(`/swap?depositAddress=${encodeURIComponent(address)}`);
  };

  const handleReset = () => {
    resetStatusState();
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
        {depositAddress ? (
          <div className="mb-6">
            <SwapStatusDisplay depositAddress={depositAddress} onReset={handleReset} />
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
                isLoading={false}
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
