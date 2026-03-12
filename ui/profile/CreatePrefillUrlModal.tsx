"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import type { Profile } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";
import { getRateAction } from "@/lib/rates/getRateAction";
import { CURRENCIES, FIAT_TICKERS } from "@/ui/verification/AmountAndWallet";
import { INLINE_SELECTOR_TRIGGER_CLASSES, OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";

interface CreatePrefillUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  tokens: Token[];
}

type LastModifiedField = "crypto" | "fiat";
type BaseLayerKey = "zec" | "btc" | "eth" | "sol";

interface CryptoOption {
  key: string;
  ticker: string;
  baseLayer: BaseLayerKey;
  chainLabel: string;
}

const MAX_MEMO_BYTES = 512;
const ZEC_TICKER = "ZEC";
const SUPPORTED_TICKERS = ["ZEC", "BTC", "ETH", "SOL", "USDC", "USDT"];
const BASE_LAYER_LABELS: Record<BaseLayerKey, string> = {
  zec: "Zcash",
  btc: "Bitcoin",
  eth: "Ethereum",
  sol: "Solana",
};
const BASE_LAYER_SORT_ORDER: Record<BaseLayerKey, number> = {
  zec: 0,
  btc: 1,
  eth: 2,
  sol: 3,
};

function fitToMaxBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let result = "";

  for (const ch of text) {
    const next = result + ch;
    if (encoder.encode(next).length > maxBytes) break;
    result = next;
  }

  return result;
}

function isPartialDecimal(value: string, maxDecimals: number): boolean {
  if (value === "") return true;
  if (!/^\d*\.?\d*$/.test(value)) return false;
  if (/^0\d+/.test(value)) return false;

  const parts = value.split(".");
  if (parts[1] && parts[1].length > maxDecimals) return false;

  return true;
}

function sanitizeDecimalAmount(rawValue: string, maxDecimals: number): string {
  const value = rawValue.trim().replace(/,/g, "");
  const normalized = value.endsWith(".") ? value.slice(0, -1) : value;
  if (!normalized || normalized === ".") return "";
  if (!/^\d*\.?\d*$/.test(normalized)) return "";
  if (/^0\d+/.test(normalized)) return "";

  const parts = normalized.split(".");
  if (parts[1] && parts[1].length > maxDecimals) return "";

  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return "";

  return normalized;
}

function getBaseLayerKey(blockchain?: string): BaseLayerKey | null {
  const chain = (blockchain ?? "").toLowerCase();
  if (chain.includes("zec") || chain.includes("zcash")) return "zec";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "btc";
  if (chain.includes("eth") || chain.includes("ethereum")) return "eth";
  if (chain.includes("sol") || chain.includes("solana")) return "sol";
  return null;
}

function formatFiatAmount(value: number): string {
  return value.toFixed(2);
}

function formatCryptoAmount(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

export default function CreatePrefillUrlModal({
  isOpen,
  onClose,
  profile,
  tokens,
}: CreatePrefillUrlModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const tapProps = shouldReduceMotion
    ? {}
    : {
      whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
      transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
    };

  const cryptoOptions = useMemo<CryptoOption[]>(() => {
    const seen = new Set<string>();
    const options: CryptoOption[] = [];

    tokens.forEach((token) => {
      const ticker = token.symbol.toUpperCase();
      if (!SUPPORTED_TICKERS.includes(ticker)) return;

      const baseLayer = getBaseLayerKey(token.blockchain);
      if (!baseLayer) return;

      const key = `${ticker}:${baseLayer}`;
      if (seen.has(key)) return;
      seen.add(key);

      options.push({
        key,
        ticker,
        baseLayer,
        chainLabel: BASE_LAYER_LABELS[baseLayer],
      });
    });

    if (!options.some((option) => option.ticker === ZEC_TICKER)) {
      options.push({
        key: `${ZEC_TICKER}:zec`,
        ticker: ZEC_TICKER,
        baseLayer: "zec",
        chainLabel: BASE_LAYER_LABELS.zec,
      });
    }

    return options.sort((a, b) => {
      if (a.ticker === ZEC_TICKER && b.ticker !== ZEC_TICKER) return -1;
      if (b.ticker === ZEC_TICKER && a.ticker !== ZEC_TICKER) return 1;
      const layerDiff = BASE_LAYER_SORT_ORDER[a.baseLayer] - BASE_LAYER_SORT_ORDER[b.baseLayer];
      if (layerDiff !== 0) return layerDiff;
      return a.ticker.localeCompare(b.ticker);
    });
  }, [tokens]);

  const [selectedTicker, setSelectedTicker] = useState(ZEC_TICKER);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<BaseLayerKey>("zec");
  const [memo, setMemo] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [fiatTicker, setFiatTicker] = useState("USD");
  const [fiatAmount, setFiatAmount] = useState("");
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [fiatSearch, setFiatSearch] = useState("");
  const [lastModifiedField, setLastModifiedField] =
    useState<LastModifiedField>("crypto");
  const [rate, setRate] = useState<number>(0);
  const [zecRate, setZecRate] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const tokenSelectorRef = useRef<HTMLDivElement | null>(null);
  const fiatSelectorRef = useRef<HTMLDivElement | null>(null);

  const selectedCryptoOption = useMemo(
    () =>
      cryptoOptions.find(
        (option) => option.ticker === selectedTicker && option.baseLayer === selectedBaseLayer,
      ) ??
      cryptoOptions.find((option) => option.ticker === selectedTicker) ??
      cryptoOptions[0],
    [selectedTicker, selectedBaseLayer, cryptoOptions]
  );

  const tickerBaseLayerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    cryptoOptions.forEach((option) => {
      counts.set(option.ticker, (counts.get(option.ticker) ?? 0) + 1);
    });
    return counts;
  }, [cryptoOptions]);

  const hasMultipleBaseLayersForSelectedTicker =
    (tickerBaseLayerCounts.get(selectedTicker) ?? 0) > 1;

  const canUseMemo = selectedTicker === ZEC_TICKER;
  const filteredFiatTickers = useMemo(() => {
    const search = fiatSearch.toLowerCase();
    return FIAT_TICKERS.filter(
      (ticker) =>
        ticker.toLowerCase().includes(search) ||
        CURRENCIES[ticker]?.name?.toLowerCase().includes(search) ||
        CURRENCIES[ticker]?.symbol?.toLowerCase().includes(search),
    );
  }, [fiatSearch]);

  const filteredTickerOptions = useMemo(() => {
    const search = tokenSearch.toLowerCase();
    return cryptoOptions.filter(
      (option) =>
        option.ticker.toLowerCase().includes(search) ||
        option.chainLabel.toLowerCase().includes(search),
    );
  }, [cryptoOptions, tokenSearch]);

  useEffect(() => {
    if (!selectedCryptoOption) return;
    if (selectedTicker !== selectedCryptoOption.ticker) {
      setSelectedTicker(selectedCryptoOption.ticker);
    }
    if (selectedBaseLayer !== selectedCryptoOption.baseLayer) {
      setSelectedBaseLayer(selectedCryptoOption.baseLayer);
    }
  }, [selectedTicker, selectedBaseLayer, selectedCryptoOption]);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setShared(false);
    setIsTokenOpen(false);
    setTokenSearch("");
    setIsCurrencyOpen(false);
    setFiatSearch("");
  }, [isOpen]);

  useEffect(() => {
    if (!isTokenOpen && !isCurrencyOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (tokenSelectorRef.current?.contains(event.target as Node)) return;
      if (fiatSelectorRef.current?.contains(event.target as Node)) return;
      setIsTokenOpen(false);
      setTokenSearch("");
      setIsCurrencyOpen(false);
      setFiatSearch("");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isTokenOpen, isCurrencyOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !fiatTicker || !selectedTicker) return;

    let cancelled = false;

    const loadRate = async () => {
      try {
        const [result, zecResult] = await Promise.all([
          getRateAction(fiatTicker, selectedTicker).catch(() => null),
          selectedTicker === ZEC_TICKER
            ? Promise.resolve(null)
            : getRateAction(fiatTicker, ZEC_TICKER).catch(() => null),
        ]);
        if (cancelled) return;

        const nextRate =
          result &&
          result.ok &&
          result.rate &&
          Number.isFinite(result.rate) &&
          result.rate > 0
            ? result.rate
            : 0;
        setRate(nextRate);

        if (selectedTicker === ZEC_TICKER) {
          setZecRate(nextRate);
          return;
        }

        const nextZecRate =
          zecResult &&
          zecResult.ok &&
          zecResult.rate &&
          Number.isFinite(zecResult.rate) &&
          zecResult.rate > 0
            ? zecResult.rate
            : 0;
        setZecRate(nextZecRate);
      } catch {
        if (!cancelled) {
          setRate(0);
          setZecRate(0);
        }
      }
    };

    void loadRate();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fiatTicker, selectedTicker]);

  const convertCryptoToFiat = useCallback(
    (nextCrypto: string) => {
      if (!rate || rate <= 0) return;
      const normalized = sanitizeDecimalAmount(nextCrypto, 8);
      if (!normalized) return;
      const converted = formatFiatAmount(Number.parseFloat(normalized) * rate);
      if (converted !== fiatAmount) setFiatAmount(converted);
    },
    [rate, fiatAmount]
  );

  const convertFiatToCrypto = useCallback(
    (nextFiat: string) => {
      if (!rate || rate <= 0) return;
      const normalized = sanitizeDecimalAmount(nextFiat, 2);
      if (!normalized) return;
      const converted = formatCryptoAmount(Number.parseFloat(normalized) / rate);
      if (converted !== cryptoAmount) setCryptoAmount(converted);
    },
    [rate, cryptoAmount]
  );

  useEffect(() => {
    if (!rate || rate <= 0) return;
    if (lastModifiedField === "fiat") {
      convertFiatToCrypto(fiatAmount);
      return;
    }
    convertCryptoToFiat(cryptoAmount);
  }, [
    rate,
    lastModifiedField,
    cryptoAmount,
    fiatAmount,
    convertCryptoToFiat,
    convertFiatToCrypto,
  ]);

  const handleCryptoAmountChange = (value: string) => {
    if (!isPartialDecimal(value, 8)) return;
    setLastModifiedField("crypto");
    setCryptoAmount(value);
    if (!value) {
      setFiatAmount("");
      return;
    }
    convertCryptoToFiat(value);
  };

  const handleFiatAmountChange = (value: string) => {
    if (!isPartialDecimal(value, 2)) return;
    setLastModifiedField("fiat");
    setFiatAmount(value);
    if (!value) {
      setCryptoAmount("");
      return;
    }
    convertFiatToCrypto(value);
  };

  const handleSelectFiatTicker = (nextTicker: string) => {
    setFiatTicker(nextTicker);
    setIsCurrencyOpen(false);
    setFiatSearch("");
  };

  const handleSelectCryptoOption = (option: CryptoOption) => {
    setSelectedTicker(option.ticker);
    setSelectedBaseLayer(option.baseLayer);
    setIsTokenOpen(false);
    setTokenSearch("");
  };

  const memoValue = useMemo(() => fitToMaxBytes(memo, MAX_MEMO_BYTES), [memo]);
  const cryptoAmountValue = useMemo(
    () => sanitizeDecimalAmount(cryptoAmount, 8),
    [cryptoAmount]
  );
  const fiatAmountValue = useMemo(
    () => sanitizeDecimalAmount(fiatAmount, 2),
    [fiatAmount]
  );
  const hasDisplayAmounts = Boolean(cryptoAmountValue && fiatAmountValue);
  const zecAmountValue = useMemo(() => {
    if (
      !hasDisplayAmounts ||
      selectedTicker === ZEC_TICKER ||
      !rate ||
      rate <= 0 ||
      !zecRate ||
      zecRate <= 0
    ) {
      return "";
    }

    const cryptoNum = Number.parseFloat(cryptoAmountValue);
    if (!Number.isFinite(cryptoNum) || cryptoNum <= 0) return "";

    const zecAmount = (cryptoNum * rate) / zecRate;
    if (!Number.isFinite(zecAmount) || zecAmount <= 0) return "";

    return formatCryptoAmount(zecAmount);
  }, [hasDisplayAmounts, selectedTicker, rate, zecRate, cryptoAmountValue]);
  const conversionDisplay = useMemo(() => {
    if (!hasDisplayAmounts) return "";

    const base =
      lastModifiedField === "fiat"
        ? `${fiatAmountValue} ${fiatTicker} = ${cryptoAmountValue} ${selectedTicker}`
        : `${cryptoAmountValue} ${selectedTicker} = ${fiatAmountValue} ${fiatTicker}`;

    if (selectedTicker !== ZEC_TICKER && zecAmountValue) {
      return `${base} = ${zecAmountValue} ZEC`;
    }

    return base;
  }, [
    hasDisplayAmounts,
    lastModifiedField,
    fiatAmountValue,
    fiatTicker,
    cryptoAmountValue,
    selectedTicker,
    zecAmountValue,
  ]);
  const requestDisplay = useMemo(() => {
    if (!hasDisplayAmounts) return "";

    if (lastModifiedField === "fiat") {
      if (selectedTicker === ZEC_TICKER) {
        return `Request ${fiatAmountValue} ${fiatTicker} in ZEC`;
      }
      return `Request ${fiatAmountValue} ${fiatTicker} in ${selectedTicker} and receive ZEC`;
    }

    if (selectedTicker === ZEC_TICKER) {
      return `Request ${cryptoAmountValue} ZEC`;
    }
    return `Request ${cryptoAmountValue} ${selectedTicker} and receive ZEC`;
  }, [
    hasDisplayAmounts,
    lastModifiedField,
    selectedTicker,
    fiatAmountValue,
    fiatTicker,
    cryptoAmountValue,
  ]);

  const previewUrl = useMemo(() => {
    const baseUrl = buildShareUrl(profile);
    const params = new URLSearchParams();
    const isNonZecTicker = selectedTicker !== ZEC_TICKER;

    if (canUseMemo && memoValue) {
      params.set("memo", memoValue);
    }

    if (isNonZecTicker) {
      params.set("ticker", selectedTicker);
      if (hasMultipleBaseLayersForSelectedTicker && selectedBaseLayer) {
        params.set("base_layer", selectedBaseLayer);
      }
    }

    if (lastModifiedField === "fiat" && fiatAmountValue) {
      params.set("fiat", fiatTicker);
      params.set("fiat_amount", fiatAmountValue);
    } else if (lastModifiedField === "crypto" && cryptoAmountValue) {
      if (!isNonZecTicker) {
        params.set("ticker", ZEC_TICKER);
      }
      params.set("amount", cryptoAmountValue);
    } else if (fiatAmountValue) {
      params.set("fiat", fiatTicker);
      params.set("fiat_amount", fiatAmountValue);
    } else if (cryptoAmountValue) {
      if (!isNonZecTicker) {
        params.set("ticker", ZEC_TICKER);
      }
      params.set("amount", cryptoAmountValue);
    }

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [
    profile,
    selectedTicker,
    hasMultipleBaseLayersForSelectedTicker,
    selectedBaseLayer,
    canUseMemo,
    memoValue,
    lastModifiedField,
    fiatTicker,
    fiatAmountValue,
    cryptoAmountValue,
  ]);

  const notes = useMemo(() => {
    const next: string[] = [];

    if (memo && memo !== memoValue) {
      next.push("Memo is capped to 512 bytes.");
    }
    if (!canUseMemo && memoValue) {
      next.push(`Memo is excluded because ${selectedTicker} paylinks do not support memo.`);
    }
    if (cryptoAmount && !cryptoAmountValue) {
      next.push(`${selectedTicker} amount must be a positive decimal with up to 8 decimal places.`);
    }
    if (fiatAmount && !fiatAmountValue) {
      next.push("Fiat amount must be a positive decimal with up to 2 decimal places.");
    }
    if (!rate || rate <= 0) {
      next.push(`Rate unavailable right now. Fiat/${selectedTicker} sync may not auto-convert.`);
    }

    return next;
  }, [
    memo,
    memoValue,
    canUseMemo,
    selectedTicker,
    cryptoAmount,
    cryptoAmountValue,
    fiatAmount,
    fiatAmountValue,
    rate,
  ]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [previewUrl]);

  const handleOpenPreview = useCallback(() => {
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Zcash.me paylink",
          text: "Open this cryptocurrency paylink:",
          url: previewUrl,
        });
      } else {
        await navigator.clipboard.writeText(previewUrl);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      setShared(false);
    }
  }, [previewUrl]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[6vh] sm:pt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200 my-4">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Paylink
            </h2>
            <p className="text-xs text-gray-500">
              Build and preview a shareable paylink for this profile.
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            {...tapProps}
            className="h-10 px-2 text-sm font-bold text-gray-700 transition-colors hover:text-[var(--color-brand-blue)]"
          >
            Close
          </motion.button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Amount ({selectedTicker})</span>
              <div ref={tokenSelectorRef} className="relative">
                <div className="flex h-11 items-center rounded-xl border border-gray-300 px-3 text-sm text-gray-900 focus-within:ring-1 focus-within:ring-[var(--color-brand-blue)]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cryptoAmount}
                    onChange={(event) => handleCryptoAmountChange(event.target.value)}
                    placeholder="0.01"
                    className="min-w-0 h-6 flex-1 self-center bg-transparent leading-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsTokenOpen((prev) => !prev);
                      setIsCurrencyOpen(false);
                      setFiatSearch("");
                    }}
                    className={`${INLINE_SELECTOR_TRIGGER_CLASSES} ml-2 h-6 shrink-0 text-md leading-none`}
                    aria-label="Choose crypto ticker"
                    aria-expanded={isTokenOpen}
                  >
                    <span className="inline-flex items-center gap-1 leading-none">
                      <span className="leading-none">{selectedTicker}</span>
                      <span className="max-w-24 truncate text-xs leading-none text-gray-500">
                        {selectedCryptoOption?.chainLabel ?? ""}
                      </span>
                    </span>
                    <span
                      className={`inline-flex h-6 w-4 items-center justify-center text-2xl leading-none transition-transform ${
                        shouldReduceMotion
                          ? "duration-100"
                          : "duration-300 ease-in-out"
                      } ${isTokenOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      {"\u25BE"}
                    </span>
                  </button>
                </div>

                {isTokenOpen && (
                  <div className="absolute right-0 top-full mt-1 z-[10000] w-72 max-h-72 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
                    <div className="border-b border-gray-200 p-2">
                      <input
                        type="text"
                        value={tokenSearch}
                        onChange={(event) => setTokenSearch(event.target.value)}
                        placeholder="Search tokens..."
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {filteredTickerOptions.map((option) => {
                        const isSelected =
                          option.ticker === selectedTicker &&
                          option.baseLayer === selectedBaseLayer;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => handleSelectCryptoOption(option)}
                            className={`group flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-[var(--color-brand-blue)] text-white"
                                : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                            }`}
                          >
                            <span
                              className={`w-12 font-semibold ${
                                isSelected ? "text-white" : "text-gray-900 group-hover:text-white"
                              }`}
                            >
                              {option.ticker}
                            </span>
                            <span
                              className={`ml-auto truncate text-xs ${
                                isSelected ? "text-white" : "text-gray-500 group-hover:text-white"
                              }`}
                            >
                              {option.chainLabel}
                            </span>
                          </button>
                        );
                      })}
                      {filteredTickerOptions.length === 0 && (
                        <div className="px-3 py-2 text-center text-sm text-gray-500">
                          No tokens found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Amount ({fiatTicker})</span>
              <div ref={fiatSelectorRef} className="relative">
                <div className="flex h-11 items-center rounded-xl border border-gray-300 px-3 text-sm text-gray-900 focus-within:ring-1 focus-within:ring-[var(--color-brand-blue)]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fiatAmount}
                    onChange={(event) => handleFiatAmountChange(event.target.value)}
                    placeholder="25.00"
                    className="min-w-0 h-6 flex-1 self-center bg-transparent leading-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCurrencyOpen((prev) => !prev);
                      setIsTokenOpen(false);
                      setTokenSearch("");
                    }}
                    className={`${INLINE_SELECTOR_TRIGGER_CLASSES} ml-2 h-6 shrink-0 text-md leading-none`}
                    aria-label="Choose fiat currency"
                    aria-expanded={isCurrencyOpen}
                  >
                    <span className="leading-none">{fiatTicker}</span>
                    <span
                      className={`inline-flex h-6 w-4 items-center justify-center text-2xl leading-none transition-transform ${
                        shouldReduceMotion
                          ? "duration-100"
                          : "duration-300 ease-in-out"
                      } ${isCurrencyOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      {"\u25BE"}
                    </span>
                  </button>
                </div>

                {isCurrencyOpen && (
                  <div className="absolute right-0 top-full mt-1 z-[10000] w-72 max-h-72 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
                    <div className="border-b border-gray-200 p-2">
                      <input
                        type="text"
                        value={fiatSearch}
                        onChange={(event) => setFiatSearch(event.target.value)}
                        placeholder="Search currencies..."
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {filteredFiatTickers.map((ticker) => {
                        const isSelected = ticker === fiatTicker;
                        return (
                          <button
                            key={ticker}
                            type="button"
                            onClick={() => handleSelectFiatTicker(ticker)}
                            className={`group flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-[var(--color-brand-blue)] text-white"
                                : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                            }`}
                          >
                            <span
                              className={`w-10 font-semibold ${
                                isSelected ? "text-white" : "text-gray-900 group-hover:text-white"
                              }`}
                            >
                              {ticker}
                            </span>
                            <span
                              className={`ml-auto truncate text-xs ${
                                isSelected ? "text-white" : "text-gray-500 group-hover:text-white"
                              }`}
                            >
                              {CURRENCIES[ticker]?.name ?? ticker}
                            </span>
                          </button>
                        );
                      })}
                      {filteredFiatTickers.length === 0 && (
                        <div className="px-3 py-2 text-center text-sm text-gray-500">
                          No currencies found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <AnimatePresence initial={false}>
            {conversionDisplay && requestDisplay && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.08 }
                    : { duration: 0.18, ease: "easeOut" as const }
                }
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">{conversionDisplay}</p>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    {requestDisplay}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Memo
              </label>
            </div>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              placeholder={canUseMemo ? "Thanks" : "Memo disabled for non-ZEC paylinks"}
              disabled={!canUseMemo}
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)] ${
                canUseMemo
                  ? "border-gray-300 text-gray-900"
                  : "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
              }`}
            />
          </div>

          {notes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-[56%]">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Preview
            </label>
            <input
              readOnly
              value={previewUrl}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-700"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <motion.button
              type="button"
              onClick={handleOpenPreview}
              {...tapProps}
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} h-10`}
            >
              Open URL
            </motion.button>
            <motion.button
              type="button"
              onClick={handleCopy}
              {...tapProps}
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} h-10`}
            >
              {copied ? "Copied" : "Copy URL"}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleShare}
              {...tapProps}
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} h-10`}
            >
              {shared ? "Shared" : "Share URL"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
