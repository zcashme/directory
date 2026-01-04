// New reusable AmountAndWallet component matching Draft styling
import React, { useMemo, useState } from "react";

const formatUsd = (value) => {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "0.000";
  return num.toFixed(3);
};

export default function AmountAndWallet({
  amount,
  setAmount,
  openWallet,
  showOpenWallet = true,
  showUsdPill = false
}) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const usdAmount = useMemo(() => formatUsd(amount || ""), [amount]);

  return (
    <div className="flex items-center gap-3 w-full mb-2">
      <div className="relative flex flex-1 items-stretch">
        <div className="pointer-events-none absolute left-1/2 top-0 w-1/2 -translate-x-1/2 border-t border-gray-800" />
        <div className="pointer-events-none absolute left-1/2 bottom-0 w-1/2 -translate-x-1/2 border-b border-gray-800" />
        <div className="relative flex-1 min-w-0">
          <input
            type="number"
            step="0.0005"
            min="0"
            inputMode="decimal"
            placeholder="0.0000"
            value={amount === "0" ? "" : amount || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (parseFloat(val) < 0) return;
              setAmount(val);
            }}
            className="border border-gray-800 px-3 rounded-xl w-full h-11 
                       text-md pr-16 text-gray-700 
                       pl-3"
          />

          {/* Right-side selector */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 text-md select-none cursor-not-allowed">
            ZEC ▼
          </div>
        </div>

        {showUsdPill && (
          <button
            type="button"
            onClick={() => setIsUsdOpen((prev) => !prev)}
            className={`flex items-center justify-center border border-l-0 border-gray-800 rounded-r-xl text-gray-700 text-md overflow-hidden transition-all duration-200 h-11 ${
              isUsdOpen ? "px-3 w-36" : "px-3 w-10"
            }`}
            aria-expanded={isUsdOpen}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-gray-700">$</span>
              {isUsdOpen && (
                <>
                  <span className="tabular-nums">{usdAmount}</span>
                  <span className="text-gray-500">USD</span>
                  <span className="text-gray-500">▼</span>
                </>
              )}
            </span>
          </button>
        )}
      </div>

      {showOpenWallet && (
        <button
          onClick={openWallet}
          className="flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 hover:border-blue-500 text-gray-700 whitespace-nowrap"
        >
          Open in Wallet
        </button>
      )}
    </div>
  );
}
