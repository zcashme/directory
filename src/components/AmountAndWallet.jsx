// New reusable AmountAndWallet component matching Draft styling
import React, { useMemo, useState } from "react";

const formatUsd = (value) => {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  return num.toFixed(2);
};

const formatRate = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "1.00";
  return num.toFixed(2);
};

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export default function AmountAndWallet({
  amount,
  setAmount,
  openWallet,
  showOpenWallet = true,
  showUsdPill = false,
  showRateMessage = false
}) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [rateSource, setRateSource] = useState("Coinbase");
  const [rateFetched, setRateFetched] = useState(false);
  const usdAmount = useMemo(() => {
    if (!rateFetched) return "";
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return "";
    return formatUsd(num * rate);
  }, [amount, rate, rateFetched]);
  const overlayRight = isUsdOpen ? "50%" : "2.5rem";
  const overlayWidth = "2.25rem";

  const fetchRateOnce = async () => {
    if (rateFetched) return;
    setRateFetched(true);
    try {
      const response = await fetch(
        "https://api.coinbase.com/v2/prices/ZEC-USD/spot"
      );
      if (!response.ok) return;
      const data = await response.json();
      const price = parseFloat(data?.data?.amount);
      if (Number.isFinite(price) && price > 0) {
        setRate(price);
        setRateSource("Coinbase");
      }
    } catch (err) {
      // keep default rate on failure
    }
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center gap-3">
        <div className="relative flex flex-1 items-stretch">
        {showUsdPill && (
          <>
            <div
              className="pointer-events-none absolute top-0 border-t border-gray-800"
              style={{
                width: overlayWidth,
                right: overlayRight,
                transform: "translateX(50%)"
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 border-b border-gray-800"
              style={{
                width: overlayWidth,
                right: overlayRight,
                transform: "translateX(50%)"
              }}
            />
          </>
        )}

        <div
          className="relative min-w-0 transition-[flex-basis] duration-200"
          style={{ flexBasis: isUsdOpen ? "50%" : "auto", flexGrow: 1 }}
        >
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
              const match = val.match(/^(\d+)(\.\d{0,8})?/);
              setAmount(match ? match[0] : val);
            }}
            className="border border-gray-800 px-3 rounded-xl w-full h-11 
                       text-md pr-16 text-gray-900 
                       pl-3"
          />

          {/* Right-side selector */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500 text-md select-none cursor-not-allowed">
            ZEC ▼
          </div>
        </div>

        {showUsdPill && (
          <div
            className={`flex items-center border border-l-0 border-gray-800 rounded-r-xl text-gray-500 text-md overflow-hidden transition-[flex-basis] duration-200 h-11 ${
              isUsdOpen ? "px-3" : "px-3 justify-center"
            }`}
            style={{ flexBasis: isUsdOpen ? "50%" : "2.5rem" }}
            aria-expanded={isUsdOpen}
          >
            <div
              className={`flex items-center w-full ${
                isUsdOpen ? "gap-2" : "justify-center"
              }`}
            >
              <span
                className="text-gray-500 cursor-pointer flex-none hover:text-blue-600"
                onClick={() => {
                  fetchRateOnce();
                  setIsUsdOpen((prev) => !prev);
                }}
                role="button"
                aria-label="Toggle currency details"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fetchRateOnce();
                    setIsUsdOpen((prev) => !prev);
                  }
                }}
              >
                $
              </span>
              {isUsdOpen && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1000000"
                    inputMode="decimal"
                    value={usdAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setAmount("");
                        return;
                      }
                      const num = parseFloat(val);
                      if (Number.isNaN(num)) return;
                      const rounded =
                        Math.round(clamp(num, 0, 1000000) * 100) / 100;
                      const zecAmount = rate > 0 ? rounded / rate : rounded;
                      setAmount(zecAmount.toFixed(8));
                    }}
                    className="min-w-0 flex-1 bg-transparent text-left tabular-nums text-gray-500 focus:outline-none"
                  />
                  <div className="ml-2 flex items-center gap-1 text-gray-500 shrink-0">
                    <span>USD</span>
                    <span>▼</span>
                  </div>
                </>
              )}
            </div>
          </div>
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

      {showRateMessage && (
        <div className="w-full flex items-center justify-center gap-2 text-center mt-2 min-h-[18px]">
          <p
            className={`text-[12px] italic m-0 text-gray-600 transition-all duration-200 ${
              rateFetched && isUsdOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1"
            }`}
          >
            Rate of {formatRate(rate)} USD per ZEC provided by {rateSource}.
          </p>
        </div>
      )}
    </div>
  );
}
