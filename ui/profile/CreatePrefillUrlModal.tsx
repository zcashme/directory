"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import type { Profile } from "@/lib/profile/types";
import { getRateAction } from "@/lib/rates/getRateAction";
import { CURRENCIES, FIAT_TICKERS } from "@/ui/verification/AmountAndWallet";
import { OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";

interface CreatePrefillUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

type LastModifiedField = "zec" | "fiat";

const MAX_MEMO_BYTES = 512;
const ZEC_TICKER = "ZEC";

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
}: CreatePrefillUrlModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const tapProps = shouldReduceMotion
    ? {}
    : {
      whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
      transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
    };
  const [memo, setMemo] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [fiatTicker, setFiatTicker] = useState("USD");
  const [fiatAmount, setFiatAmount] = useState("");
  const [lastModifiedField, setLastModifiedField] =
    useState<LastModifiedField>("zec");
  const [rate, setRate] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setShared(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !fiatTicker) return;

    let cancelled = false;

    const loadRate = async () => {
      setIsRateLoading(true);
      try {
        const result = await getRateAction(fiatTicker, ZEC_TICKER);
        if (cancelled) return;
        if (
          result.ok &&
          result.rate &&
          Number.isFinite(result.rate) &&
          result.rate > 0
        ) {
          setRate(result.rate);
        } else {
          setRate(0);
        }
      } catch {
        if (!cancelled) setRate(0);
      } finally {
        if (!cancelled) setIsRateLoading(false);
      }
    };

    void loadRate();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fiatTicker]);

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
    setLastModifiedField("zec");
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

  const memoValue = useMemo(() => fitToMaxBytes(memo, MAX_MEMO_BYTES), [memo]);
  const memoBytes = useMemo(
    () => new TextEncoder().encode(memoValue).length,
    [memoValue]
  );
  const cryptoAmountValue = useMemo(
    () => sanitizeDecimalAmount(cryptoAmount, 8),
    [cryptoAmount]
  );
  const fiatAmountValue = useMemo(
    () => sanitizeDecimalAmount(fiatAmount, 2),
    [fiatAmount]
  );

  const previewUrl = useMemo(() => {
    const baseUrl = buildShareUrl(profile);
    const params = new URLSearchParams();

    if (memoValue) params.set("memo", memoValue);

    if (lastModifiedField === "fiat" && fiatAmountValue) {
      params.set("fiat", fiatTicker);
      params.set("fiat_amount", fiatAmountValue);
    } else if (lastModifiedField === "zec" && cryptoAmountValue) {
      params.set("ticker", ZEC_TICKER);
      params.set("amount", cryptoAmountValue);
    } else if (fiatAmountValue) {
      params.set("fiat", fiatTicker);
      params.set("fiat_amount", fiatAmountValue);
    } else if (cryptoAmountValue) {
      params.set("ticker", ZEC_TICKER);
      params.set("amount", cryptoAmountValue);
    }

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [
    profile,
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
    if (cryptoAmount && !cryptoAmountValue) {
      next.push("ZEC amount must be a positive decimal with up to 8 decimal places.");
    }
    if (fiatAmount && !fiatAmountValue) {
      next.push("Fiat amount must be a positive decimal with up to 2 decimal places.");
    }
    if (!rate || rate <= 0) {
      next.push("Rate unavailable right now. Fiat/ZEC sync may not auto-convert.");
    }

    return next;
  }, [
    memo,
    memoValue,
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
          text: "Open this Zcash paylink:",
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
            className={`${OUTLINE_ACTION_BUTTON_CLASSES} h-10`}
          >
            Close
          </motion.button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            {"Payable in ZEC, BTC, SOL, USDT, USDC \u2014 you will receive ZEC."}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Amount ({ZEC_TICKER})</span>
              <input
                type="text"
                inputMode="decimal"
                value={cryptoAmount}
                onChange={(event) => handleCryptoAmountChange(event.target.value)}
                placeholder="0.01"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
              />
            </label>
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Fiat ticker</span>
              <select
                value={fiatTicker}
                onChange={(event) => setFiatTicker(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
              >
                {FIAT_TICKERS.map((ticker) => (
                  <option key={ticker} value={ticker}>
                    {ticker} - {CURRENCIES[ticker]?.name ?? ticker}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Amount ({fiatTicker})</span>
              <input
                type="text"
                inputMode="decimal"
                value={fiatAmount}
                onChange={(event) => handleFiatAmountChange(event.target.value)}
                placeholder="25.00"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
              />
            </label>
          </div>

          <p className="text-xs text-gray-500">
            {isRateLoading
              ? `Loading ${fiatTicker}/${ZEC_TICKER} rate...`
              : rate > 0
                ? `1 ${ZEC_TICKER} = ${formatFiatAmount(rate)} ${fiatTicker}. Last modified field controls URL amount params.`
                : `Rate unavailable for ${ZEC_TICKER}/${fiatTicker}. Last modified field controls URL amount params.`}
          </p>

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
              placeholder="Thanks"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>Only available using ZEC</span>
              <span>{memoBytes}/{MAX_MEMO_BYTES} bytes</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Preview paylink
            </label>
            <textarea
              readOnly
              value={previewUrl}
              rows={3}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-700"
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

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
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
    </div>,
    document.body
  );
}
