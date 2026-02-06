"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

const FIAT_TICKERS = [
  "USD","AED","AUD","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD","HUF","IDR",
  "ILS","INR","JPY","KRW","MXN","MYR","NOK","NZD","PHP","PLN","SAR","SEK","SGD","THB","TRY","VND","ZAR"
];

const FIAT_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥",
  HKD: "HK$", SGD: "S$", NZD: "NZ$", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč",
  HUF: "Ft", TRY: "₺", ILS: "₪", INR: "₹", BRL: "R$", MXN: "MX$", IDR: "Rp", MYR: "RM",
  PHP: "₱", THB: "฿", VND: "₫", ZAR: "R", KRW: "₩", AED: "AED", SAR: "SAR"
};

const FIAT_NAMES = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen", AUD: "Australian Dollar",
  CAD: "Canadian Dollar", CHF: "Swiss Franc", CNY: "Chinese Yuan", HKD: "Hong Kong Dollar",
  SGD: "Singapore Dollar", NZD: "New Zealand Dollar", SEK: "Swedish Krona", NOK: "Norwegian Krone",
  DKK: "Danish Krone", PLN: "Polish Zloty", CZK: "Czech Koruna", HUF: "Hungarian Forint",
  TRY: "Turkish Lira", ILS: "Israeli Shekel", INR: "Indian Rupee", BRL: "Brazilian Real",
  MXN: "Mexican Peso", IDR: "Indonesian Rupiah", MYR: "Malaysian Ringgit", PHP: "Philippine Peso",
  THB: "Thai Baht", VND: "Vietnamese Dong", ZAR: "South African Rand", KRW: "South Korean Won",
  AED: "UAE Dirham", SAR: "Saudi Riyal"
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

/**
 * Convert a Number -> string with up to `decimals` fractional digits,
 * WITHOUT padding trailing zeros.
 */
const formatCryptoNoPad = (num, decimals = 8) => {
  if (!Number.isFinite(num)) return "";
  // keep high precision, then trim zeros
  const s = num.toFixed(decimals);
  // remove trailing zeros + optional dot
  const trimmed = s.replace(/\.?0+$/, "");
  // keep "0" for very small/zero
  return trimmed === "" ? "0" : trimmed;
};

export default function AmountAndWallet({
  amount,
  setAmount,

  asset,
  setAsset,
  assetOptions = [],

  showRefund = false,
  refundLabel = "Your refund address",
  refundAddress = "",
  setRefundAddress,
  refundPlaceholder = "Paste your address",

  openWallet,
  openWalletLabel = "Open in Wallet",
  showOpenWallet = true,
  showUsdPill = false,
  showRateMessage = false,
}) {
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const [fiat, setFiat] = useState("USD");
  const [rate, setRate] = useState(1);
  const [rateSource, setRateSource] = useState("API");
  const [rateFetched, setRateFetched] = useState(false);
  const [rateRequested, setRateRequested] = useState(false);
  const [usdInput, setUsdInput] = useState("");

  // prevent effects from overwriting what the user is typing
  const [lastEdited, setLastEdited] = useState("crypto"); // "crypto" | "fiat"

  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const assetWrapRef = useRef(null);

  const [assetQuery, setAssetQuery] = useState("");
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  const assetSearchRef = useRef(null);

  const filteredAssetOptions = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return assetOptions;
    return assetOptions.filter((opt) => {
      const sym = String(opt.symbol || "").toLowerCase();
      const label = String(opt.label || "").toLowerCase();
      return sym.includes(q) || label.includes(q);
    });
  }, [assetOptions, assetQuery]);

  const fiatSymbol = FIAT_SYMBOLS[fiat] || "$";
  const rightPillWidth = isUsdOpen ? "50%" : "2.5rem";
  const leftPillWidth = `calc(100% - ${rightPillWidth})`;

  const overlayRight = isUsdOpen ? "50%" : "2.5rem";
  const overlayWidth = "2.25rem";
  const overlayHalf = "1.125rem";
  const overlayRightOffset = `calc(${overlayRight} - ${overlayHalf})`;

  const fetchRate = async (nextFiat) => {
    try {
      const response = await fetch(
        `/api/rates?fiat=${nextFiat}&asset=${encodeURIComponent(asset || "")}`
      );
      if (!response.ok) return false;
      const data = await response.json();
      const price = Number(data?.rate);
      if (Number.isFinite(price) && price > 0) {
        setRate(price);
        setRateSource(data?.source || "API");
        setRateFetched(true);
        return true;
      }
    } catch {
      // ignore
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
  }, [rateRequested, fiat, asset]);

  useEffect(() => {
    if (!rateRequested) return;
    setRateFetched(false);
    setUsdInput("");
    fetchRate(fiat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiat, asset, rateRequested]);

  // auto-sync USD from crypto ONLY when user is typing crypto
  useEffect(() => {
    if (!rateFetched || !isUsdOpen) return;
    if (lastEdited !== "crypto") return;

    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) {
      setUsdInput("");
      return;
    }
    setUsdInput(formatUsd(num * rate));
  }, [rate, rateFetched, isUsdOpen, amount, lastEdited]);

  useEffect(() => {
    if (!isUsdOpen) setIsCurrencyOpen(false);
  }, [isUsdOpen]);

  const handleToggleUsd = () => {
    if (!rateRequested) {
      setRateRequested(true);
      fetchRate(fiat);
    }
    setIsUsdOpen((prev) => !prev);
  };

  const handleToggleCurrency = () => setIsCurrencyOpen((prev) => !prev);

  useEffect(() => {
    if (!isAssetOpen) return;

    const onDown = (e) => {
      if (!assetWrapRef.current) return;
      if (!assetWrapRef.current.contains(e.target)) setIsAssetOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setIsAssetOpen(false);
    };

    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [isAssetOpen]);

  return (
    <div className="w-full mb-2">
      <div className="flex items-center gap-3">
        <div className="relative flex flex-1 items-stretch overflow-visible">
          {showUsdPill && (
            <>
              <div
                className="pointer-events-none absolute top-0 border-t border-gray-800"
                style={{ width: overlayWidth, right: overlayRightOffset }}
              />
              <div
                className="pointer-events-none absolute bottom-0 border-b border-gray-800"
                style={{ width: overlayWidth, right: overlayRightOffset }}
              />
            </>
          )}

          <div
            className="relative min-w-0 transition-[width] duration-200 box-border"
            style={showUsdPill ? { width: leftPillWidth } : { width: "100%" }}
          >
            {/* IMPORTANT: do NOT hide "0" anymore */}
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0000"
              value={amount ?? ""}
              onChange={(e) => {
                setLastEdited("crypto");

                const val = e.target.value;

                // allow clearing
                if (val === "") {
                  setAmount("");
                  if (isUsdOpen) setUsdInput("");
                  return;
                }

                // allow digits + single dot
                if (!/^\d*\.?\d*$/.test(val)) return;

                // limit to 8 decimals, but DON'T pad
                const [a, b] = val.split(".");
                const next = b != null ? `${a}.${b.slice(0, 8)}` : a;

                setAmount(next);

                if (rateFetched && isUsdOpen) {
                  const num = parseFloat(next || "0");
                  if (!Number.isNaN(num)) setUsdInput(formatUsd(num * rate));
                  else setUsdInput("");
                }
              }}
              className="border border-gray-800 px-3 rounded-xl w-full h-11 text-md pr-16 text-gray-900 pl-3"
            />

            {/* Asset selector */}
            <div ref={assetWrapRef} className="absolute right-2 top-1/2 -translate-y-1/2 z-[200]">
              <button
                type="button"
                onClick={() => {
                  setIsAssetOpen((p) => {
                    const next = !p;
                    if (next) {
                      setAssetQuery("");
                      setActiveAssetIndex(0);
                      setTimeout(() => assetSearchRef.current?.focus(), 0);
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 text-md hover:text-blue-600"
                aria-haspopup="listbox"
                aria-expanded={isAssetOpen}
              >
                <span>{asset ? asset : "…"} ▼</span>
              </button>

              {isAssetOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-64 border border-gray-200 bg-white rounded-xl shadow-lg z-[9999] overflow-hidden"
                  role="listbox"
                >
                  <div className="p-2 border-b border-gray-100 bg-white">
                    <input
                      ref={assetSearchRef}
                      value={assetQuery}
                      onChange={(e) => {
                        setAssetQuery(e.target.value);
                        setActiveAssetIndex(0);
                      }}
                      placeholder="Type to filter…"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveAssetIndex((i) =>
                            Math.min(i + 1, Math.max(0, filteredAssetOptions.length - 1))
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveAssetIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const opt = filteredAssetOptions[activeAssetIndex];
                          if (opt) {
                            setAsset?.(opt.id);
                            setIsAssetOpen(false);
                          }
                        } else if (e.key === "Escape") {
                          setIsAssetOpen(false);
                        }
                      }}
                    />
                  </div>

                  <div className="max-h-72 overflow-auto">
                    {filteredAssetOptions.length ? (
                      filteredAssetOptions.map((opt, idx) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                            idx === activeAssetIndex ? "bg-blue-50" : ""
                          }`}
                          onMouseEnter={() => setActiveAssetIndex(idx)}
                          onClick={() => {
                            setAsset?.(opt.id);
                            setIsAssetOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {opt.logo ? (
                              <img
                                src={opt.logo}
                                alt=""
                                className="w-5 h-5 rounded-full"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold">{opt.symbol}</div>
                              <div className="text-xs text-gray-400 truncate">{opt.label}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                    )}
                  </div>
                </div>
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
              <div className={`flex items-center w-full ${isUsdOpen ? "gap-2" : "justify-center"}`}>
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
                      onChange={(e) => {
                        setLastEdited("fiat");

                        const val = e.target.value;

                        if (val === "") {
                          setAmount("");
                          setUsdInput("");
                          return;
                        }

                        if (!/^\d*\.?\d*$/.test(val)) return;

                        const [a, b] = val.split(".");
                        const next = b != null ? `${a}.${b.slice(0, 2)}` : a;
                        setUsdInput(next);

                        const num = parseFloat(next);
                        if (Number.isNaN(num)) return;

                        const rounded = Math.round(clamp(num, 0, 1000000) * 100) / 100;
                        const assetAmount = rate > 0 ? rounded / rate : rounded;

                        // IMPORTANT: no padding zeros
                        setAmount(formatCryptoNoPad(assetAmount, 8));
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
                          <span className="w-6 text-gray-500">{FIAT_SYMBOLS[ticker] || ""}</span>
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

      {showRefund && (
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">{refundLabel}</label>
          <input
            value={refundAddress}
            onChange={(e) => setRefundAddress?.(e.target.value.trim())}
            placeholder={refundPlaceholder}
            className="border border-gray-800 px-3 rounded-xl w-full h-11 text-md text-gray-900"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}

      {showRateMessage && (
        <div className="w-full flex items-center justify-center gap-2 text-center mt-2 min-h-[18px]">
          <p
            className={`text-[12px] italic m-0 text-gray-600 transition-all duration-200 ${
              rateFetched && isUsdOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
          >
            Rate of {formatRate(rate)} {fiat} per {asset || "asset"} provided by {rateSource}.
          </p>
        </div>
      )}
    </div>
  );
}
