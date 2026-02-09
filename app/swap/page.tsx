"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import type { FormEvent, ChangeEvent } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { parseTokenSymbol } from "@/lib/swap/tokenUtils";
import { useSwapStore } from "@/lib/stores/swap";

const STATUS_CONFIG = {
  SUCCESS: { color: "bg-green-100 text-green-700", label: "Success" },
  FAILED: { color: "bg-red-100 text-red-700", label: "Failed" },
  REFUNDED: { color: "bg-red-100 text-red-700", label: "Refunded" },
  INCOMPLETE_DEPOSIT: { color: "bg-red-100 text-red-700", label: "Incomplete" },
  PROCESSING: { color: "bg-blue-100 text-blue-700", label: "Processing" },
  PENDING_DEPOSIT: { color: "bg-blue-100 text-blue-700", label: "Pending" },
} as const;

function SwapStatusForm({ onSubmit }: { onSubmit: (_address: string) => void }) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError("Address required");
      return;
    }
    setError("");
    onSubmit(address.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={address}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
        placeholder="Deposit address"
        className="w-full border border-gray-800 px-3 py-2 rounded-xl text-md"
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        className="w-full border border-gray-800 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
      >
        Check Status
      </button>
    </form>
  );
}

function TokenIcon({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const colors: Record<string, string> = {
    ZEC: "bg-yellow-400", BTC: "bg-orange-400", ETH: "bg-blue-400",
    USDC: "bg-blue-300", USDT: "bg-green-400", SOL: "bg-purple-400",
    ARB: "bg-blue-500", NEAR: "bg-gray-700",
  };

  return (
    <div
      className={`${colors[symbol] || "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol?.[0] || "?"}
    </div>
  );
}

function SwapStatusDisplay({ depositAddress, onReset }: { depositAddress: string; onReset: () => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { statusData, statusError, startPolling, stopPolling } = useSwapStore();

  useEffect(() => {
    startPolling(depositAddress);
    return () => stopPolling();
  }, [depositAddress, startPolling, stopPolling]);

  const status = statusData?.status?.toUpperCase() || "PENDING_DEPOSIT";
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING_DEPOSIT;
  const isPolling = !['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(status);

  const details = statusData?.swapDetails;
  const quote = statusData?.quoteResponse?.quote;
  const request = statusData?.quoteResponse?.quoteRequest;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-md font-semibold">Swap Status</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.color}`}>
          {config.label}
        </span>
        {isPolling && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0, 0.1, 0.2].map((delay, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">
              {status === "PENDING_DEPOSIT" ? "Receiving" : "Swapping"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Sent</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={parseTokenSymbol(request?.originAsset) || ""} size={24} />
            <p className="text-lg font-semibold">{details?.amountInFormatted || "—"}</p>
          </div>
          <p className="text-xs text-gray-600">{details?.amountInUsd ? `$${details.amountInUsd}` : "—"}</p>
        </div>

        <div className="border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2">Received</p>
          <div className="flex items-center gap-2 mb-1">
            <TokenIcon symbol={parseTokenSymbol(request?.destinationAsset) || ""} size={24} />
            <p className="text-lg font-semibold">{details?.amountOutFormatted || "—"}</p>
          </div>
          <p className="text-xs text-gray-600">{details?.amountOutUsd ? `$${details.amountOutUsd}` : "—"}</p>
        </div>
      </div>

      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 font-semibold"
        >
          <span>Details</span>
          <span className={`transform transition ${detailsOpen ? "rotate-180" : ""}`}>▲</span>
        </button>

        {detailsOpen && (
          <div className="border-t border-gray-800 px-4 py-3 space-y-3 text-sm">
            {[
              { label: "Origin", value: `${parseTokenSymbol(request?.originAsset)} (${request?.originAsset})` },
              { label: "Destination", value: `${parseTokenSymbol(request?.destinationAsset)} (${request?.destinationAsset})` },
              { label: "Deposit Address", value: depositAddress, mono: true },
              { label: "Min Amount Out", value: quote?.amountOutFormatted && `${quote.amountOutFormatted} ${parseTokenSymbol(request?.destinationAsset)}` },
              { label: "Time Estimate", value: quote?.timeEstimate && `${quote.timeEstimate} seconds` },
              { label: "Deadline", value: quote?.deadline && new Date(quote.deadline).toLocaleString() },
              { label: "Refund To", value: request?.refundTo, mono: true },
              { label: "Updated", value: statusData?.updatedAt && new Date(statusData.updatedAt).toLocaleString() },
            ].map(({ label, value, mono }, i) =>
              value ? (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-gray-600">{label}</span>
                  <span className={`text-xs text-right ${mono ? "font-mono break-all max-w-xs" : ""}`}>{value}</span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {statusError && (
        <div className="text-red-600 text-sm border border-red-300 rounded-xl p-3 bg-red-50">
          {statusError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
        >
          Check Another
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="flex-1 border border-gray-800 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}

function SwapPageContent() {
  const depositAddress = useSearchParams().get("depositAddress");
  const router = useRouter();
  const stopPolling = useSwapStore((s) => s.stopPolling);

  const handleReset = () => {
    stopPolling();
    router.push("/swap");
  };

  return (
    <>
      <ProfileHeader />
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--color-background)" }}>
        <div className="max-w-2xl mx-auto">
          {depositAddress ? (
            <SwapStatusDisplay depositAddress={depositAddress} onReset={handleReset} />
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-md font-semibold">Swap Status</h1>
              </div>
              <SwapStatusForm onSubmit={(addr) => router.push(`/swap?depositAddress=${encodeURIComponent(addr)}`)} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function SwapPage() {
  return (
    <Suspense
      fallback={
        <>
          <ProfileHeader />
          <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--color-background)" }}>
            <div className="max-w-2xl mx-auto">
              <h1 className="text-md font-semibold mb-6">Swap Status</h1>
              <div className="text-center text-gray-600">Loading...</div>
            </div>
          </div>
        </>
      }
    >
      <SwapPageContent />
    </Suspense>
  );
}
