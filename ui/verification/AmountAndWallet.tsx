"use client";

import { useEffect, useState } from "react";
import { getRateAction } from "@/lib/rates/getRateAction";

interface Currency {
  symbol: string;
  name: string;
}

const CURRENCIES: Record<string, Currency> = {
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

const formatDecimal = (value: number, fallback = "") => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
};

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

interface TokenOption {
  id: string;
  symbol?: string;
  ticker?: string;
  label?: string;
  logo?: string;
  chain?: string;
}

interface AmountAndWalletProps {
  // Required props
  amount: string;
  setAmount: (_amount: string) => void;
  openWallet?: () => void;

  // Optional props with defaults
  openWalletLabel?: string;
  showOpenWallet?: boolean;
  showUsdPill?: boolean;
  showRateMessage?: boolean;

  // Token selector props (optional)
  asset?: string;
  assetOptions?: TokenOption[];
  setAsset?: (_asset: string) => void;

  // Refund address props (optional)
  showRefund?: boolean;
  refundAddress?: string;
  setRefundAddress?: (_address: string) => void;
  tokenBlockchain?: string;
}

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
  setRefundAddress,
  tokenBlockchain = ""
}: AmountAndWalletProps) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [fiatSearch, setFiatSearch] = useState("");
  const [fiat, setFiat] = useState("USD");
  const [rate, setRate] = useState(1);
  const [rateSource, setRateSource] = useState("API");
  const [rateFetched, setRateFetched] = useState(false);
  const [rateRequested, setRateRequested] = useState(false);
  const [usdInput, setUsdInput] = useState("");
  const [isTypingFiat, setIsTypingFiat] = useState(false);
  const fiatSymbol = CURRENCIES[fiat]?.symbol || "$";
  const rightPillWidth = isUsdOpen ? "50%" : "2.5rem";
  const leftPillWidth = `calc(100% - ${rightPillWidth})`;

  const overlayRight = isUsdOpen ? "50%" : "2.5rem";
  const overlayWidth = "2.25rem";
  const overlayHalf = "1.125rem";
  const overlayRightOffset = `calc(${overlayRight} - ${overlayHalf})`;

  const fetchRate = async (nextFiat: string, nextAsset: string) => {
    try {
      const result = await getRateAction(nextFiat || "USD", nextAsset || "ZEC");
      if (result.ok && result.rate && Number.isFinite(result.rate) && result.rate > 0) {
        setRate(result.rate);
        setRateSource(result.source ?? "API");
        setRateFetched(true);
        return true;
      }
    } catch {
      // Silent error handling
    }
    return false;
  };

  useEffect(() => {
    if (!rateRequested) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchRate(fiat, asset);
    }, 60000);
    return () => clearInterval(id);
  }, [rateRequested, fiat, asset]);

  useEffect(() => {
    if (!rateFetched || !isUsdOpen || isTypingFiat) return;
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return;
    setUsdInput(formatDecimal(num * rate));
  }, [amount, rate, rateFetched, isUsdOpen, isTypingFiat]);

  useEffect(() => {
    if (!isUsdOpen) {
      setIsCurrencyOpen(false);
      setFiatSearch("");
    }
  }, [isUsdOpen]);

  // Close token dropdown when clicking outside
  useEffect(() => {
    if (!isTokenDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".token-selector")) {
        setIsTokenDropdownOpen(false);
        setTokenSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTokenDropdownOpen]);

  // Close fiat dropdown when clicking outside
  useEffect(() => {
    if (!isCurrencyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".fiat-selector")) {
        setIsCurrencyOpen(false);
        setFiatSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCurrencyOpen]);

  useEffect(() => {
    if (!rateRequested) return;
    setRateFetched(false);
    setUsdInput("");
    void fetchRate(fiat, asset);
  }, [fiat, asset, rateRequested]);

  const handleToggleUsd = () => {
    if (!rateRequested) {
      setRateRequested(true);
      void fetchRate(fiat, asset);
    }
    setIsUsdOpen((prev) => !prev);
  };

  const handleToggleCurrency = () => {
    setIsCurrencyOpen((prev) => !prev);
  };

  const matchesTokenSearch = (token: TokenOption) => {
    if (!tokenSearch) return true;
    const term = tokenSearch.toLowerCase();
    if (token.symbol?.toLowerCase().includes(term)) return true;
    if (token.label?.toLowerCase().includes(term)) return true;
    return false;
  };

  return (
    <div className="w-full mb-2">
      {showRateMessage && (
        <div className="w-full flex items-center justify-center gap-2 text-center mb-2 min-h-[18px]">
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
              type="text"
              inputMode="decimal"
              placeholder="0.0000"
              value={amount || ""}
              onChange={(e) => {
                const val = e.target.value;

                // Allow empty string
                if (val === "") {
                  setAmount("");
                  if (rateFetched && isUsdOpen) {
                    setUsdInput("");
                  }
                  return;
                }

                // Only allow digits and a single decimal point
                if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

                // Reject multiple leading zeros (00, 001, etc.) but allow "0" and "0."
                if (/^0\d+/.test(val)) return;

                // Cap decimal places at 8
                const parts = val.split('.');
                if (parts[1] && parts[1].length > 8) return;

                setAmount(val);

                // Auto-open USD pill when typing a number if it's available
                if (showUsdPill && !isUsdOpen && val && !rateRequested) {
                  setRateRequested(true);
                  void fetchRate(fiat, asset);
                  setIsUsdOpen(true);
                }

                // Update fiat side only if we have a valid complete number
                if (rateFetched && isUsdOpen && val && !val.endsWith('.')) {
                  const num = parseFloat(val);
                  if (Number.isFinite(num) && num > 0) {
                    setUsdInput(formatDecimal(num * rate));
                  }
                }
              }}
              className="border border-gray-800 px-3 rounded-xl w-full h-11
                         text-md pr-16 text-gray-900
                         pl-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            {/* Right-side token selector */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500 text-md token-selector pointer-events-none">
              {setAsset && assetOptions.length > 0 ? (
                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                  >
                    <span>{asset}</span>
                    <span>▼</span>
                  </button>
                  {isTokenDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-gray-800 rounded-xl shadow-lg z-50 pointer-events-auto">
                      <div className="p-2 border-b border-gray-800">
                        <input
                          type="text"
                          value={tokenSearch}
                          onChange={(e) => setTokenSearch(e.target.value)}
                          placeholder="Search tokens..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div className="py-1">
                        {assetOptions
                          .filter(matchesTokenSearch)
                          .map((token) => (
                            <button
                              key={token.id}
                              type="button"
                              onClick={() => {
                                setAsset(token.id);
                                setIsTokenDropdownOpen(false);
                                setTokenSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                asset === (token.symbol ?? token.ticker)
                                  ? "bg-blue-50 font-semibold text-gray-900"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {token.logo && (
                                <img
                                  src={token.logo}
                                  alt={token.symbol}
                                  className="w-5 h-5 rounded-full flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              )}
                              <span className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate">{token.symbol}</div>
                                <div className="text-xs text-gray-500 truncate">{token.chain}</div>
                              </span>
                            </button>
                          ))}
                        {assetOptions.filter(matchesTokenSearch).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No tokens found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="select-none cursor-not-allowed">{asset}</div>
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
                      type="text"
                      inputMode="decimal"
                      value={usdInput}
                      disabled={!rateFetched}
                      onFocus={() => setIsTypingFiat(true)}
                      onBlur={() => setIsTypingFiat(false)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setUsdInput("");
                          return;
                        }

                        // Only allow digits and a single decimal point
                        if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

                        // Reject multiple decimal points
                        const dotMatches = val.match(/\./g) ?? [];
                        if (dotMatches.length > 1) return;

                        // Reject multiple leading zeros like "00" or "001"
                        if (/^0{2,}/.test(val)) return;

                        // Cap decimal places at 2 for fiat
                        const parts = val.split('.');
                        if (parts[1] && parts[1].length > 2) return;

                        setUsdInput(val);

                        // Update crypto side only if we have a valid complete number
                        if (val && !val.endsWith('.')) {
                          const num = parseFloat(val);
                          if (Number.isFinite(num)) {
                            const clamped = clamp(num, 0, 1000000);
                            const cryptoAmount = rate > 0 ? clamped / rate : clamped;
                            // Format to reasonable precision while preserving trailing zeros intent
                            const formatted = cryptoAmount.toFixed(8).replace(/\.?0+$/, "");
                            setAmount(formatted);
                          }
                        }
                      }}
                      className="min-w-0 flex-1 bg-transparent text-left tabular-nums text-gray-900 focus:outline-hidden disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="ml-2 flex items-center gap-1 text-gray-500 shrink-0 fiat-selector relative">
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
                      {isCurrencyOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-hidden bg-white border border-gray-800 rounded-xl shadow-lg z-50">
                          <div className="p-2 border-b border-gray-800">
                            <input
                              type="text"
                              value={fiatSearch}
                              onChange={(e) => setFiatSearch(e.target.value)}
                              placeholder="Search currencies..."
                              className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          <div className="py-1 max-h-60 overflow-y-auto">
                            {FIAT_TICKERS.filter((ticker) =>
                              !fiatSearch ||
                              ticker.toLowerCase().includes(fiatSearch.toLowerCase()) ||
                              CURRENCIES[ticker]?.name?.toLowerCase().includes(fiatSearch.toLowerCase()) ||
                              CURRENCIES[ticker]?.symbol?.toLowerCase().includes(fiatSearch.toLowerCase())
                            ).map((ticker) => (
                              <button
                                key={ticker}
                                type="button"
                                onClick={() => {
                                  setFiat(ticker);
                                  setIsCurrencyOpen(false);
                                  setFiatSearch("");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                  fiat === ticker
                                    ? "bg-blue-50 font-semibold text-gray-900"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span className="w-6 text-gray-600 flex-shrink-0">
                                  {CURRENCIES[ticker]?.symbol || ""}
                                </span>
                                <span className="text-gray-800 font-medium flex-shrink-0">{ticker}</span>
                                <span className="ml-auto text-xs text-gray-500 text-right truncate flex-1 min-w-0">
                                  {CURRENCIES[ticker]?.name || ""}
                                </span>
                              </button>
                            ))}
                            {FIAT_TICKERS.filter((ticker) =>
                              !fiatSearch ||
                              ticker.toLowerCase().includes(fiatSearch.toLowerCase()) ||
                              CURRENCIES[ticker]?.name?.toLowerCase().includes(fiatSearch.toLowerCase()) ||
                              CURRENCIES[ticker]?.symbol?.toLowerCase().includes(fiatSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No currencies found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
            {openWalletLabel}
          </button>
        )}
      </div>

      {showRefund && (
        <div className="w-full mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your {asset} {tokenBlockchain && `(${tokenBlockchain.toUpperCase()})`} refund address
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
