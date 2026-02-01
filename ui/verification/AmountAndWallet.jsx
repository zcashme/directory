"use client";

// New reusable AmountAndWallet component matching Draft styling
import React, { useEffect, useState } from "react";

const FIAT_TICKERS = [
  "USD",
  "AED",
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "VND",
  "ZAR"
];

const FIAT_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  HKD: "HK$",
  SGD: "S$",
  NZD: "NZ$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  TRY: "₺",
  ILS: "₪",
  INR: "₹",
  BRL: "R$",
  MXN: "MX$",
  IDR: "Rp",
  MYR: "RM",
  PHP: "₱",
  THB: "฿",
  VND: "₫",
  ZAR: "R",
  KRW: "₩",
  AED: "AED",
  SAR: "SAR"
};

const FIAT_NAMES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  HKD: "Hong Kong Dollar",
  SGD: "Singapore Dollar",
  NZD: "New Zealand Dollar",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  PLN: "Polish Zloty",
  CZK: "Czech Koruna",
  HUF: "Hungarian Forint",
  TRY: "Turkish Lira",
  ILS: "Israeli Shekel",
  INR: "Indian Rupee",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
  PHP: "Philippine Peso",
  THB: "Thai Baht",
  VND: "Vietnamese Dong",
  ZAR: "South African Rand",
  KRW: "South Korean Won",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal"
};


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
  openWalletLabel = "Open in Wallet",
  showOpenWallet = true,
  showUsdPill = false,
  showRateMessage = false
}) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [fiat, setFiat] = useState("USD");
  const [rate, setRate] = useState(1);
  const [rateSource, setRateSource] = useState("API");
  const [rateFetched, setRateFetched] = useState(false);
  const [rateRequested, setRateRequested] = useState(false);
  const [usdInput, setUsdInput] = useState("");
  const fiatSymbol = FIAT_SYMBOLS[fiat] || "$";
  const rightPillWidth = isUsdOpen ? "50%" : "2.5rem";
  const leftPillWidth = `calc(100% - ${rightPillWidth})`;

  const overlayRight = isUsdOpen ? "50%" : "2.5rem";
  const overlayWidth = "2.25rem";
  const overlayHalf = "1.125rem";
  const overlayRightOffset = `calc(${overlayRight} - ${overlayHalf})`;

  const fetchRate = async (nextFiat) => {
    try {
      const response = await fetch(`/api/rates?fiat=${nextFiat}`);
      if (!response.ok) return false;
      const data = await response.json();
      const price = Number(data?.rate);
      if (Number.isFinite(price) && price > 0) {
        setRate(price);
        setRateSource(data?.source || "API");
        setRateFetched(true);
        return true;
      }
    } catch (err) {
      // keep current rate on failure
    }
    return false;
  };

  useEffect(() => {
    if (!rateRequested) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchRate(fiat);
    }, 60000);
    return () => clearInterval(id);
  }, [rateRequested, fiat]);

  useEffect(() => {
    if (!rateFetched || !isUsdOpen) return;
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return;
    setUsdInput(formatUsd(num * rate));
  }, [rate, rateFetched, isUsdOpen]);

  useEffect(() => {
    if (!isUsdOpen) setIsCurrencyOpen(false);
  }, [isUsdOpen]);

  useEffect(() => {
    if (!rateRequested) return;
    setRateFetched(false);
    setUsdInput("");
    fetchRate(fiat);
  }, [fiat, rateRequested]);

  const handleToggleUsd = () => {
    if (!rateRequested) {
      setRateRequested(true);
      fetchRate(fiat);
    }
    setIsUsdOpen((prev) => !prev);
  };

  const handleToggleCurrency = () => {
    setIsCurrencyOpen((prev) => !prev);
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center gap-3">
        <div className="relative flex flex-1 items-stretch overflow-visible">
          {showUsdPill && (
            <>
              <div
                className="pointer-events-none absolute top-0 border-t border-gray-800"
                style={{
                  width: overlayWidth,
                  right: overlayRightOffset
                }}
              />
              <div
                className="pointer-events-none absolute bottom-0 border-b border-gray-800"
                style={{
                  width: overlayWidth,
                  right: overlayRightOffset
                }}
              />
            </>
          )}

          <div
            className="relative min-w-0 transition-[width] duration-200 box-border"
            style={showUsdPill ? { width: leftPillWidth } : { width: "100%" }}
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
                const next = match ? match[0] : val;
                setAmount(next);
                if (rateFetched && isUsdOpen) {
                  const num = parseFloat(next || "0");
                  if (!Number.isNaN(num)) {
                    setUsdInput(formatUsd(num * rate));
                  }
                }
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
              className={`relative flex items-center border border-l-0 border-gray-800 rounded-r-xl text-gray-500 text-md h-11 overflow-visible min-w-0 transition-[width] duration-200 box-border ${
                isUsdOpen ? "px-3" : "px-3 justify-center"
              }`}
              style={{ width: rightPillWidth }}
              aria-expanded={isUsdOpen}
            >
              <div
                className={`flex items-center w-full ${
                  isUsdOpen ? "gap-2" : "justify-center"
                }`}
              >
                <span
                  className="text-gray-500 cursor-pointer flex-none hover:text-blue-600"
                  onClick={handleToggleUsd}
                  role="button"
                  aria-label="Toggle currency details"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleUsd();
                    }
                  }}
                >
                  {fiatSymbol}
                </span>
                {isUsdOpen && (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000000"
                      inputMode="decimal"
                      value={usdInput}
                      disabled={!rateFetched}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setAmount("");
                          setUsdInput("");
                          return;
                        }
                        const num = parseFloat(val);
                        if (Number.isNaN(num)) return;
                        setUsdInput(val);
                        const rounded =
                          Math.round(clamp(num, 0, 1000000) * 100) / 100;
                        const zecAmount = rate > 0 ? rounded / rate : rounded;
                        setAmount(zecAmount.toFixed(8));
                      }}
                      className="min-w-0 flex-1 bg-transparent text-left tabular-nums text-gray-500 focus:outline-none disabled:opacity-60"
                    />
                    <div className="ml-2 flex items-center gap-1 text-gray-500 shrink-0">
                      <span>{fiat}</span>
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        role="button"
                        aria-label="Choose fiat currency"
                        tabIndex={0}
                        onClick={handleToggleCurrency}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleCurrency();
                          }
                        }}
                      >
                        ▼
                      </span>
                    </div>
                  </>
                )}
              </div>

              {isUsdOpen && (
                <div
                  className={`absolute -left-1.75 top-full w-[calc(100%-12px+10px)] border border-t-0 border-gray-800 rounded-bl-xl rounded-br-none overflow-hidden transition-all duration-200 bg-[var(--color-background)] z-50 ${
                    isCurrencyOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="flex flex-col py-1 max-h-72 overflow-y-auto">
                    {FIAT_TICKERS.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => {
                          setFiat(ticker);
                          setIsCurrencyOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-sm text-gray-600 hover:text-blue-600 ${
                          fiat === ticker ? "font-semibold" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-gray-500">
                            {FIAT_SYMBOLS[ticker] || ""}
                          </span>
                          <span className="text-gray-700">{ticker}</span>
                          <span className="ml-auto text-[11px] text-gray-400 text-right">
                            {FIAT_NAMES[ticker] || ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showOpenWallet && (
          <button
            onClick={openWallet}
            className="flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 hover:border-blue-500 text-gray-700 whitespace-nowrap"
          >
            {openWalletLabel}
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
            Rate of {formatRate(rate)} {fiat} per ZEC provided by {rateSource}.
          </p>
        </div>
      )}
    </div>
  );
}

