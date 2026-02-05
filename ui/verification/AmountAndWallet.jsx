"use client";

import React, { useEffect, useState } from "react";

const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar" },
  AED: { symbol: "AED", name: "UAE Dirham" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  CZK: { symbol: "Kč", name: "Czech Koruna" },
  DKK: { symbol: "kr", name: "Danish Krone" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  HUF: { symbol: "Ft", name: "Hungarian Forint" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  ILS: { symbol: "₪", name: "Israeli Shekel" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  NOK: { symbol: "kr", name: "Norwegian Krone" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  PLN: { symbol: "zł", name: "Polish Zloty" },
  SAR: { symbol: "SAR", name: "Saudi Riyal" },
  SEK: { symbol: "kr", name: "Swedish Krona" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  THB: { symbol: "฿", name: "Thai Baht" },
  TRY: { symbol: "₺", name: "Turkish Lira" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  ZAR: { symbol: "R", name: "South African Rand" }
};
const FIAT_TICKERS = Object.keys(CURRENCIES);

const formatDecimal = (value, fallback = "") => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
};

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export default function AmountAndWallet({
  amount,
  setAmount,
  openWallet,
  openWalletLabel = "Open in Wallet",
  showOpenWallet = true,
  showUsdPill = false,
  showRateMessage = false,
  // Token selector props (optional)
  asset = "ZEC",
  assetOptions = [],
  setAsset,
  // Refund address props (optional)
  showRefund = false,
  refundAddress = "",
  setRefundAddress
}) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [fiat, setFiat] = useState("USD");
  const [rate, setRate] = useState(1);
  const [rateSource, setRateSource] = useState("API");
  const [rateFetched, setRateFetched] = useState(false);
  const [rateRequested, setRateRequested] = useState(false);
  const [usdInput, setUsdInput] = useState("");
  const fiatSymbol = CURRENCIES[fiat]?.symbol || "$";
  const rightPillWidth = isUsdOpen ? "50%" : "2.5rem";
  const leftPillWidth = `calc(100% - ${rightPillWidth})`;

  const overlayRight = isUsdOpen ? "50%" : "2.5rem";
  const overlayWidth = "2.25rem";
  const overlayHalf = "1.125rem";
  const overlayRightOffset = `calc(${overlayRight} - ${overlayHalf})`;

  const fetchRate = async (nextFiat, nextAsset) => {
    try {
      const assetParam = nextAsset && nextAsset !== "ZEC" ? `&asset=${nextAsset}` : "";
      const response = await fetch(`/api/rates?fiat=${nextFiat}${assetParam}`);
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
    }
    return false;
  };

  useEffect(() => {
    if (!rateRequested) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchRate(fiat, asset);
    }, 60000);
    return () => clearInterval(id);
  }, [rateRequested, fiat, asset]);

  useEffect(() => {
    if (!rateFetched || !isUsdOpen) return;
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return;
    setUsdInput(formatDecimal(num * rate));
  }, [rate, rateFetched, isUsdOpen]);

  useEffect(() => {
    if (!isUsdOpen) setIsCurrencyOpen(false);
  }, [isUsdOpen]);

  // Close token dropdown when clicking outside
  useEffect(() => {
    if (!isTokenDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".token-selector")) {
        setIsTokenDropdownOpen(false);
        setTokenSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTokenDropdownOpen]);

  useEffect(() => {
    if (!rateRequested) return;
    setRateFetched(false);
    setUsdInput("");
    fetchRate(fiat, asset);
  }, [fiat, asset, rateRequested]);

  const handleToggleUsd = () => {
    if (!rateRequested) {
      setRateRequested(true);
      fetchRate(fiat, asset);
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
                    setUsdInput(formatDecimal(num * rate));
                  }
                }
              }}
              className="border border-gray-800 px-3 rounded-xl w-full h-11
                         text-md pr-16 text-gray-900
                         pl-3"
            />

            {/* Right-side token selector */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500 text-md token-selector">
              {setAsset && assetOptions.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                  >
                    <span>{asset}</span>
                    <span>▼</span>
                  </button>
                  {isTokenDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-gray-800 rounded-xl shadow-lg z-50">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={tokenSearch}
                          onChange={(e) => setTokenSearch(e.target.value)}
                          placeholder="Search tokens..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          autoFocus
                        />
                      </div>
                      <div className="py-1">
                        {assetOptions
                          .filter((token) =>
                            !tokenSearch ||
                            token.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()) ||
                            token.label?.toLowerCase().includes(tokenSearch.toLowerCase())
                          )
                          .map((token) => (
                            <button
                              key={token.id}
                              type="button"
                              onClick={() => {
                                setAsset(token.id);
                                setIsTokenDropdownOpen(false);
                                setTokenSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                                asset === (token.symbol || token.ticker) ? "bg-blue-50 font-semibold" : ""
                              }`}
                            >
                              {token.logo && (
                                <img
                                  src={token.logo}
                                  alt={token.symbol}
                                  className="w-5 h-5 rounded-full"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              )}
                              <span className="flex-1">
                                <div className="font-medium text-gray-800">{token.symbol}</div>
                                <div className="text-xs text-gray-500">{token.chain}</div>
                              </span>
                            </button>
                          ))}
                        {assetOptions.filter((token) =>
                          !tokenSearch ||
                          token.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()) ||
                          token.label?.toLowerCase().includes(tokenSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No tokens found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="select-none cursor-not-allowed">{asset} ▼</div>
              )}
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
                      className="min-w-0 flex-1 bg-transparent text-left tabular-nums text-gray-500 focus:outline-hidden disabled:opacity-60"
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
                            {CURRENCIES[ticker]?.symbol || ""}
                          </span>
                          <span className="text-gray-700">{ticker}</span>
                          <span className="ml-auto text-[11px] text-gray-400 text-right">
                            {CURRENCIES[ticker]?.name || ""}
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
            Rate of {formatDecimal(rate, "1.00")} {fiat} per {asset} provided by {rateSource}.
          </p>
        </div>
      )}

      {showRefund && (
        <div className="w-full mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your {asset} refund address (in case swap fails)
          </label>
          <input
            type="text"
            value={refundAddress}
            onChange={(e) => setRefundAddress?.(e.target.value)}
            placeholder={`Paste your ${asset} address`}
            className="w-full border border-gray-800 px-3 py-2 rounded-xl text-md text-gray-900 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}

