"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getRateAction } from "@/lib/rates/getRateAction";
import { INLINE_SELECTOR_TRIGGER_CLASSES, OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/styles/interactive";
import { withFieldBorderState } from "@/ui/styles/fields";

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
  ZAR: { symbol: "R", name: "South African Rand" },
};
const FIAT_TICKERS = Object.keys(CURRENCIES);
const FIAT_STATE_STORAGE_KEY = "zcashme.amountAndWallet.fiatState";

const formatDecimal = (value: number, fallback = "") => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
};

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

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
  // Token selector props (optional)
  asset = "ZEC",
  assetOptions = [],
  setAsset,
  // Refund address props (optional)
  showRefund = false,
  refundAddress = "",
  setRefundAddress,
  tokenBlockchain = "",
}: AmountAndWalletProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [isRefundFocused, setIsRefundFocused] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [fiatSearch, setFiatSearch] = useState("");
  const [fiat, setFiat] = useState("USD");
  const [rate, setRate] = useState(1);
  const [rateFetched, setRateFetched] = useState(false);
  const [rateRequested, setRateRequested] = useState(false);
  const [usdInput, setUsdInput] = useState("");
  const [isTypingFiat, setIsTypingFiat] = useState(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [preferFiatValue, setPreferFiatValue] = useState(false);
  const [fiatStateHydrated, setFiatStateHydrated] = useState(false);
  const tapProps = shouldReduceMotion
    ? {}
    : {
      whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
      transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
    };
  const fiatSymbol = CURRENCIES[fiat]?.symbol || "$";
  const rightPillWidth = isUsdOpen ? "45%" : "2.5rem";
  const leftPillWidth = `calc(100% - ${rightPillWidth})`;

  const overlayRight = isUsdOpen ? "45%" : "2.5rem";
  const overlayWidth = "2.25rem";
  const overlayHalf = "1.125rem";
  const overlayRightOffset = `calc(${overlayRight} - ${overlayHalf})`;

  const fetchRate = async (nextFiat: string, nextAsset: string) => {
    try {
      const result = await getRateAction(nextFiat || "USD", nextAsset || "ZEC");
      if (
        result.ok &&
        result.rate &&
        Number.isFinite(result.rate) &&
        result.rate > 0
      ) {
        setRate(result.rate);
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
    if (!rateFetched || !isUsdOpen || isTypingFiat || preferFiatValue) return;
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return;
    setUsdInput(formatDecimal(num * rate));
  }, [amount, rate, rateFetched, isUsdOpen, isTypingFiat, preferFiatValue]);

  useEffect(() => {
    if (!isUsdOpen) {
      setIsCurrencyOpen(false);
      setFiatSearch("");
    }
  }, [isUsdOpen]);

  useEffect(() => {
    if (!showUsdPill || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(FIAT_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        usdInput?: string;
        fiat?: string;
        preferFiatValue?: boolean;
        isUsdOpen?: boolean;
      };
      if (typeof parsed.usdInput === "string") setUsdInput(parsed.usdInput);
      if (typeof parsed.fiat === "string" && FIAT_TICKERS.includes(parsed.fiat)) setFiat(parsed.fiat);
      if (typeof parsed.preferFiatValue === "boolean") setPreferFiatValue(parsed.preferFiatValue);
      if (parsed.isUsdOpen) {
        setIsUsdOpen(true);
        setRateRequested(true);
      }
    } catch {
      // Ignore malformed session data.
    } finally {
      setFiatStateHydrated(true);
    }
  }, [showUsdPill]);

  useEffect(() => {
    if (!showUsdPill || typeof window === "undefined") return;
    if (!fiatStateHydrated) return;
    try {
      window.sessionStorage.setItem(
        FIAT_STATE_STORAGE_KEY,
        JSON.stringify({
          usdInput,
          fiat,
          preferFiatValue,
          isUsdOpen,
        })
      );
    } catch {
      // Ignore storage errors.
    }
  }, [showUsdPill, fiatStateHydrated, usdInput, fiat, preferFiatValue, isUsdOpen]);

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
    void fetchRate(fiat, asset);
  }, [fiat, asset, rateRequested]);

  useEffect(() => {
    if (!rateFetched || !isUsdOpen || !preferFiatValue) return;
    if (!usdInput || usdInput.endsWith(".")) return;
    const num = parseFloat(usdInput);
    if (!Number.isFinite(num)) return;
    const clamped = clamp(num, 0, 1000000);
    const cryptoAmount = rate > 0 ? clamped / rate : clamped;
    const formatted = cryptoAmount.toFixed(8).replace(/\.?0+$/, "");
    if (formatted === (amount || "")) return;
    setAmount(formatted);
  }, [rateFetched, isUsdOpen, preferFiatValue, usdInput, rate, amount, setAmount]);

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
    <div className="w-full max-w-full mb-2 min-w-0">
      <div className="w-full max-w-full min-w-0 flex items-center gap-3">
        <div
          ref={inputContainerRef}
          className={`relative flex items-stretch overflow-visible min-w-0 max-w-full ${showOpenWallet ? "flex-1" : "w-full"
            }`}
        >
          {showUsdPill && (
            <>
              <div
                className="pointer-events-none absolute top-0 border-t border-gray-800"
                style={{
                  width: overlayWidth,
                  right: overlayRightOffset,
                }}
              />
              <div
                className="pointer-events-none absolute bottom-0 border-b border-gray-800"
                style={{
                  width: overlayWidth,
                  right: overlayRightOffset,
                }}
              />
            </>
          )}

          <div
            className="relative min-w-0 max-w-full transition-[width] duration-200 box-border"
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
                const parts = val.split(".");
                if (parts[1] && parts[1].length > 8) return;

                setAmount(val);
                setPreferFiatValue(false);

                // Auto-open USD pill when typing a number if it's available
                if (showUsdPill && !isUsdOpen && val && !rateRequested) {
                  setRateRequested(true);
                  void fetchRate(fiat, asset);
                  setIsUsdOpen(true);
                }

                // Update fiat side only if we have a valid complete number
                if (rateFetched && isUsdOpen && val && !val.endsWith(".")) {
                  const num = parseFloat(val);
                  if (Number.isFinite(num) && num > 0) {
                    setUsdInput(formatDecimal(num * rate));
                  }
                }
              }}
              className={`border px-3 rounded-xl w-full h-11
                         text-md pr-12 md:pr-16 text-gray-900
                         pl-3 outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${withFieldBorderState("border-gray-800")}`}
            />

            {/* Right-side token selector */}
            <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center text-gray-500 text-md token-selector pointer-events-none">
              {setAsset && assetOptions.length > 0 ? (
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTokenDropdownOpen(!isTokenDropdownOpen);
                    }}
                    className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                  >
                    <span>{asset}</span>
                    <span
                      className={`inline-block transition-transform ${
                        shouldReduceMotion
                          ? "duration-100"
                          : "duration-300 ease-in-out"
                      } ${isTokenDropdownOpen ? "rotate-180" : "rotate-0"}`}
                    >
                      ▼
                    </span>
                  </button>
                </div>
              ) : (
                <div className="select-none cursor-not-allowed">{asset}</div>
              )}
            </div>
            {setAsset && assetOptions.length > 0 && isTokenDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-gray-800 rounded-xl shadow-lg z-50 pointer-events-auto token-selector">
                <div className="p-2 border-b border-gray-800">
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder="Search tokens..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="py-1">
                  {assetOptions
                    .filter(matchesTokenSearch)
                    .map((token) => (
                      <motion.button
                        key={token.id}
                        type="button"
                        onClick={() => {
                          setAsset(token.id);
                          setIsTokenDropdownOpen(false);
                          setTokenSearch("");
                        }}
                        {...tapProps}
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
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                        <span className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">
                            {token.symbol}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {token.chain}
                          </div>
                        </span>
                      </motion.button>
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

          {showUsdPill && (
            <div
              className={`relative flex items-center border border-l-0 border-gray-800 rounded-r-xl text-gray-500 text-md h-11 min-w-0 max-w-full transition-[width] duration-200 box-border ${isUsdOpen ? "px-3" : "px-3 justify-center"
                }`}
              style={{ width: rightPillWidth }}
              aria-expanded={isUsdOpen}
            >
              <div
                className={`flex items-center w-full min-w-0 ${isUsdOpen ? "gap-2" : "justify-center"
                  }`}
              >
                <motion.button
                  type="button"
                  {...tapProps}
                  className={`${INLINE_SELECTOR_TRIGGER_CLASSES} flex-none`}
                  onClick={handleToggleUsd}
                  aria-label="Toggle currency details"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleUsd();
                    }
                  }}
                >
                  {fiatSymbol}
                </motion.button>
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
                          setPreferFiatValue(true);
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
                        const parts = val.split(".");
                        if (parts[1] && parts[1].length > 2) return;

                        setUsdInput(val);
                        setPreferFiatValue(true);

                        // Update crypto side only if we have a valid complete number
                        if (val && !val.endsWith(".")) {
                          const num = parseFloat(val);
                          if (Number.isFinite(num)) {
                            const clamped = clamp(num, 0, 1000000);
                            const cryptoAmount =
                              rate > 0 ? clamped / rate : clamped;
                            // Format to reasonable precision while preserving trailing zeros intent
                            const formatted = cryptoAmount
                              .toFixed(8)
                              .replace(/\.?0+$/, "");
                            setAmount(formatted);
                          }
                        }
                      }}
                      className="min-w-0 flex-1 bg-transparent text-left tabular-nums text-gray-900 focus:outline-hidden disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="ml-2 flex items-center gap-1 text-gray-500 shrink-0 fiat-selector">
                      <motion.button
                        type="button"
                        {...tapProps}
                        className={INLINE_SELECTOR_TRIGGER_CLASSES}
                        aria-label="Choose fiat currency"
                        onClick={handleToggleCurrency}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleCurrency();
                          }
                        }}
                      >
                        <span>{fiat}</span>
                        <span
                          className={`inline-block transition-transform ${
                            shouldReduceMotion
                              ? "duration-100"
                              : "duration-300 ease-in-out"
                          } ${isCurrencyOpen ? "rotate-180" : "rotate-0"}`}
                        >
                          ▼
                        </span>
                      </motion.button>
                      {isCurrencyOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-hidden bg-white border border-gray-800 rounded-xl shadow-lg z-[9999]">
                          <div className="p-2 border-b border-gray-800">
                            <input
                              type="text"
                              value={fiatSearch}
                              onChange={(e) => setFiatSearch(e.target.value)}
                              placeholder="Search currencies..."
                              className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="py-1 max-h-60 overflow-y-auto">
                            {FIAT_TICKERS.filter(
                              (ticker) =>
                                !fiatSearch ||
                                ticker
                                  .toLowerCase()
                                  .includes(fiatSearch.toLowerCase()) ||
                                CURRENCIES[ticker]?.name
                                  ?.toLowerCase()
                                  .includes(fiatSearch.toLowerCase()) ||
                                CURRENCIES[ticker]?.symbol
                                  ?.toLowerCase()
                                  .includes(fiatSearch.toLowerCase()),
                            ).map((ticker) => (
                              <motion.button
                                key={ticker}
                                type="button"
                                onClick={() => {
                                  setFiat(ticker);
                                  setIsCurrencyOpen(false);
                                  setFiatSearch("");
                                }}
                                {...tapProps}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                  fiat === ticker
                                    ? "bg-blue-50 font-semibold text-gray-900"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span className="w-6 text-gray-600 flex-shrink-0">
                                  {CURRENCIES[ticker]?.symbol || ""}
                                </span>
                                <span className="text-gray-800 font-medium flex-shrink-0">
                                  {ticker}
                                </span>
                                <span className="ml-auto text-xs text-gray-500 text-right truncate flex-1 min-w-0">
                                  {CURRENCIES[ticker]?.name || ""}
                                </span>
                              </motion.button>
                            ))}
                            {FIAT_TICKERS.filter(
                              (ticker) =>
                                !fiatSearch ||
                                ticker
                                  .toLowerCase()
                                  .includes(fiatSearch.toLowerCase()) ||
                                CURRENCIES[ticker]?.name
                                  ?.toLowerCase()
                                  .includes(fiatSearch.toLowerCase()) ||
                                CURRENCIES[ticker]?.symbol
                                  ?.toLowerCase()
                                  .includes(fiatSearch.toLowerCase()),
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
          <motion.button
            onClick={openWallet}
            {...tapProps}
            className={OUTLINE_ACTION_BUTTON_CLASSES}
          >
            {openWalletLabel}
          </motion.button>
        )}
      </div>

      {showRefund && (
        <div className="w-full mt-3">
          {isRefundFocused && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your {asset}{" "}
              {tokenBlockchain && `(${tokenBlockchain.toUpperCase()})`} refund
              address (in case {asset} → ZEC fails)
            </label>
          )}
          <input
            type="text"
            value={refundAddress}
            onChange={(e) => setRefundAddress?.(e.target.value)}
            onFocus={() => setIsRefundFocused(true)}
            onBlur={() => setIsRefundFocused(false)}
            placeholder={`Paste your ${asset} refund address`}
            className={`w-full border px-3 py-2 rounded-xl text-md text-gray-900 outline-hidden ${withFieldBorderState("border-gray-800")}`}
          />
        </div>
      )}
    </div>
  );
}


