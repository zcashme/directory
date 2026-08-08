"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import { DEFAULT_PROFILE_PAGE_BACKGROUND, resolveProfileVisualTheme } from "@/lib/profile/profileCardTheme";
import type { Profile } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";
import { getRateAction } from "@/lib/rates/getRateAction";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import { CURRENCIES, FIAT_TICKERS } from "@/ui/verification/AmountAndWallet";
import {
  PROFILE_CARD_ICON_BUTTON_CLASSES,
  PROFILE_CARD_INLINE_SELECTOR_TRIGGER_CLASSES,
  PROFILE_CARD_MODAL_CHROME_CLASSES,
  PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES,
  getProfileCardTapMotionProps,
} from "@/ui/common/buttons/styles";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

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

interface MemoLeftIconProps {
  text: string;
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
const NATIVE_TICKER_BY_BASE_LAYER: Record<BaseLayerKey, string> = {
  zec: "ZEC",
  btc: "BTC",
  eth: "ETH",
  sol: "SOL",
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

function formatQrInlineText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function isTruthyLike(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

function MemoLeftIcon({ text }: MemoLeftIconProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const showCircle = bytes > 128;

  if (!showCircle) {
    return (
      <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M3 11L4 8L9.5 2.5C9.9 2.1 10.5 2.1 10.9 2.5L11.5 3.1C11.9 3.5 11.9 4.1 11.5 4.5L6 10L3 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const remaining = Math.max(0, MAX_MEMO_BYTES - bytes);
  const remainingRatio = remaining / MAX_MEMO_BYTES;
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - remainingRatio);

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="rgba(156, 163, 175, 0.35)"
        strokeWidth="2"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="var(--color-brand-blue)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-[stroke-dashoffset] duration-200 ease-out"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transformBox: "fill-box",
        }}
      />
    </svg>
  );
}

export default function CreatePrefillUrlModal({
  isOpen,
  onClose,
  profile,
  tokens,
}: CreatePrefillUrlModalProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = getProfileCardTapMotionProps(shouldReduceMotion);

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
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharedQr, setSharedQr] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const qrRef = useRef<SVGSVGElement | null>(null);
  const tokenSelectorRef = useRef<HTMLDivElement | null>(null);
  const fiatSelectorRef = useRef<HTMLDivElement | null>(null);
  const memoTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeMemoTextarea = useCallback((textarea?: HTMLTextAreaElement | null) => {
    const el = textarea ?? memoTextareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const style = window.getComputedStyle(el);
    const parsedLineHeight = Number.parseFloat(style.lineHeight);
    const parsedFontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.isFinite(parsedLineHeight)
      ? parsedLineHeight
      : Number.isFinite(parsedFontSize)
        ? parsedFontSize * 1.5
        : 20;
    const verticalPadding =
      Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const verticalBorder =
      Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
    const minHeight = lineHeight * 2 + verticalPadding + verticalBorder;
    const nextHeight = Math.max(el.scrollHeight + lineHeight, minHeight);
    el.style.height = `${nextHeight}px`;
  }, []);

  const emoji = useEmojiAutocomplete({
    textareaRef: memoTextareaRef,
    value: memo,
    setValue: setMemo,
  });

  const selectedCryptoOption = useMemo(
    () =>
      cryptoOptions.find(
        (option) => option.ticker === selectedTicker && option.baseLayer === selectedBaseLayer,
      ) ??
      cryptoOptions.find((option) => option.ticker === selectedTicker) ??
      cryptoOptions[0],
    [selectedTicker, selectedBaseLayer, cryptoOptions]
  );
  const shouldShowSelectedBaseLayerInLabel = useMemo(() => {
    if (!selectedCryptoOption) return false;
    return NATIVE_TICKER_BY_BASE_LAYER[selectedCryptoOption.baseLayer] !== selectedCryptoOption.ticker;
  }, [selectedCryptoOption]);

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
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 480px)");
    const syncLayout = () => setIsWideLayout(mediaQuery.matches);
    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setShared(false);
    setShowQr(isWideLayout);
    setSaved(false);
    setSharedQr(false);
    setIsTokenOpen(false);
    setTokenSearch("");
    setIsCurrencyOpen(false);
    setFiatSearch("");
  }, [isOpen, isWideLayout]);

  useEffect(() => {
    if (!isOpen || !isWideLayout) return;
    setShowQr(true);
  }, [isOpen, isWideLayout]);

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
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !fiatTicker || !selectedTicker) return;

    let cancelled = false;

    const loadRate = async () => {
      try {
        const result = await getRateAction(fiatTicker, selectedTicker).catch(() => null);
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
      } catch {
        if (!cancelled) {
          setRate(0);
        }
      }
    };

    void loadRate();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fiatTicker, selectedTicker]);

  useEffect(() => {
    if (!isOpen) return;
    resizeMemoTextarea();
  }, [isOpen, memo, resizeMemoTextarea]);

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
  ]);

  const isMaxi = useMemo(() => isTruthyLike(profile.is_maxi), [profile.is_maxi]);
  const qrCardTheme = useMemo(() => resolveProfileVisualTheme({
    isMaxi,
    profileThemePackage: profile.profile_theme_package,
    profileCardTheme: profile.profile_card_theme,
    profilePageBackground: profile.profile_page_bkgd,
    profileCardBorder: profile.profile_card_border,
  }), [
    isMaxi,
    profile.profile_theme_package,
    profile.profile_card_theme,
    profile.profile_page_bkgd,
    profile.profile_card_border,
  ]);
  const shouldUseDefaultQrCardBackground = useMemo(() => {
    const normalizedSurface = qrCardTheme.cardSurface.trim().toLowerCase();
    return (
      !qrCardTheme.packageId &&
      (
        normalizedSurface === "transparent" ||
        normalizedSurface === "rgba(0,0,0,0)" ||
        normalizedSurface === "rgba(0, 0, 0, 0)"
      )
    );
  }, [qrCardTheme.packageId, qrCardTheme.cardSurface]);
  const effectiveQrCardSurface = useMemo(
    () => (shouldUseDefaultQrCardBackground ? DEFAULT_PROFILE_PAGE_BACKGROUND : qrCardTheme.cardSurface),
    [shouldUseDefaultQrCardBackground, qrCardTheme.cardSurface]
  );
  const effectiveQrCardSurfaceSolid = useMemo(
    () => (shouldUseDefaultQrCardBackground ? DEFAULT_PROFILE_PAGE_BACKGROUND : qrCardTheme.cardSurfaceSolid),
    [shouldUseDefaultQrCardBackground, qrCardTheme.cardSurfaceSolid]
  );
  const qrPreviewCardBackground = useMemo(
    () => (
      qrCardTheme.packageId
        ? `repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.12) 0px, rgba(255, 255, 255, 0.12) 1px, transparent 1px, transparent 9px), ${effectiveQrCardSurface}`
        : effectiveQrCardSurface
    ),
    [qrCardTheme.packageId, effectiveQrCardSurface]
  );
  const cardUsername = useMemo(() => {
    const value = (profile.name ?? "").trim();
    return value.length > 0 ? value : "recipient";
  }, [profile.name]);
  const cardDisplayName = useMemo(() => {
    const value = (profile.display_name ?? profile.name ?? "").trim();
    return value.length > 0 ? value : "Recipient";
  }, [profile.display_name, profile.name]);
  const qrMemoLabel = useMemo(() => {
    if (!canUseMemo || !memoValue) return null;
    return `"${memoValue}"`;
  }, [canUseMemo, memoValue]);
  const qrAmountForFilename = useMemo(() => {
    if (lastModifiedField === "fiat" && fiatAmountValue) {
      return `${fiatAmountValue}-${fiatTicker}`;
    }
    if (cryptoAmountValue) {
      return `${cryptoAmountValue}-${selectedTicker}`;
    }
    if (fiatAmountValue) {
      return `${fiatAmountValue}-${fiatTicker}`;
    }
    return "amount";
  }, [
    lastModifiedField,
    fiatAmountValue,
    fiatTicker,
    cryptoAmountValue,
    selectedTicker,
  ]);
  const memoFilenameSnippet = useMemo(() => {
    if (!canUseMemo || !memoValue) return "memo";
    const words = memoValue
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .join("-");
    return words || "memo";
  }, [canUseMemo, memoValue]);
  const hasEnteredAmount = useMemo(
    () => Boolean(cryptoAmountValue || fiatAmountValue),
    [cryptoAmountValue, fiatAmountValue]
  );
  const rateUnavailable = useMemo(
    () => !rate || rate <= 0,
    [rate]
  );
  const showNoAmountSelectedWarning = useMemo(() => !hasEnteredAmount, [hasEnteredAmount]);
  const qrRequestLine = useMemo(() => {
    if (!hasEnteredAmount) return null;
    if (lastModifiedField === "fiat" && fiatAmountValue) {
      return `${cardDisplayName} requests ${fiatAmountValue} ${fiatTicker}`;
    }
    if (lastModifiedField === "crypto" && cryptoAmountValue) {
      return `${cardDisplayName} requests ${cryptoAmountValue} ${selectedTicker}`;
    }
    if (requestDisplay) {
      return requestDisplay.replace(/^Request\s+/i, `${cardDisplayName} requests `);
    }
    if (cryptoAmountValue) {
      return `${cardDisplayName} requests ${cryptoAmountValue} ${selectedTicker}`;
    }
    if (fiatAmountValue) {
      return `${cardDisplayName} requests ${fiatAmountValue} ${fiatTicker}`;
    }
    return null;
  }, [
    hasEnteredAmount,
    requestDisplay,
    cardDisplayName,
    lastModifiedField,
    fiatAmountValue,
    fiatTicker,
    cryptoAmountValue,
    selectedTicker,
  ]);
  const qrUriLabel = useMemo(() => `Zcash.me/${cardUsername}`, [cardUsername]);
  const qrDetails = useMemo(() => {
    const details: string[] = [];
    details.push(qrUriLabel);
    return details;
  }, [qrUriLabel]);
  const preMemoWarnings = useMemo(() => {
    const warnings: Array<{ key: string; text: string; tone: "info" | "warning" }> = [];
    if (requestDisplay) {
      warnings.push({ key: "request", text: requestDisplay, tone: "info" });
    } else if (showNoAmountSelectedWarning) {
      warnings.push({ key: "no-amount", text: "No amount selected", tone: "warning" });
    }
    if (rateUnavailable) {
      warnings.push({
        key: "rate-unavailable",
        text: `Rate unavailable right now. Fiat/${selectedTicker} sync may not auto-convert.`,
        tone: "warning",
      });
    }
    return warnings;
  }, [requestDisplay, showNoAmountSelectedWarning, rateUnavailable, selectedTicker]);

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

  const buildQrExport = useCallback(async (): Promise<{ blob: Blob; filename: string } | null> => {
    const svg = qrRef.current;
    if (!svg) return null;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const safeName = (profile.display_name ?? profile.name ?? "recipient")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load QR image"));
        image.src = svgUrl;
      });

      const exportWidth = 1600;
      const cardHorizontalInset = 120;
      const cardX = cardHorizontalInset;
      const cardY = 140;
      const cardWidth = exportWidth - cardHorizontalInset * 2;
      const qrPanelSize = Math.round(cardWidth * 0.83);
      const qrPanelX = (exportWidth - qrPanelSize) / 2;
      const qrPanelY = cardY + 260;
      const qrTextBandHeight = Math.round(qrPanelSize * 0.11);
      const qrSize = qrPanelSize - qrTextBandHeight * 2;
      const qrX = (exportWidth - qrSize) / 2;
      const qrY = qrPanelY + qrTextBandHeight;
      const qrTextBandMidpoint = qrTextBandHeight / 2;
      const detailsLineHeight = 68;
      const detailsStartY = qrPanelY + qrPanelSize + 92;
      const detailsBottomY =
        qrDetails.length > 0
          ? detailsStartY + (qrDetails.length - 1) * detailsLineHeight
          : qrPanelY + qrPanelSize;
      const cardBottomPadding = 88;
      const cardBottomY = detailsBottomY + cardBottomPadding;
      const cardHeight = cardBottomY - cardY;
      const exportBottomPadding = 72;
      const exportHeight = cardBottomY + exportBottomPadding;

      const canvas = document.createElement("canvas");
      canvas.width = exportWidth;
      canvas.height = exportHeight;

      const context = canvas.getContext("2d");
      if (!context) return null;

      const drawRoundedRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.arcTo(x + width, y, x + width, y + r, r);
        ctx.lineTo(x + width, y + height - r);
        ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
        ctx.lineTo(x + r, y + height);
        ctx.arcTo(x, y + height, x, y + height - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, exportWidth, exportHeight);

      drawRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 96);
      context.fillStyle = effectiveQrCardSurfaceSolid;
      context.fill();
      context.strokeStyle = qrCardTheme.borderColor ?? "#111827";
      context.lineWidth = 6;
      context.stroke();

      const avatarRadius = 100;
      const avatarInnerRadius = avatarRadius - 6;
      const avatarCenterX = exportWidth / 2;
      const avatarCenterY = cardY;
      const avatarUrl = profile.profile_image_url?.trim();
      context.save();
      context.beginPath();
      context.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      context.closePath();
      context.fillStyle = DEFAULT_PROFILE_PAGE_BACKGROUND;
      context.fill();
      let avatarImageDrawn = false;
      const drawDefaultAvatarFace = () => {
        const scale = (avatarInnerRadius * 2) / 64;
        context.save();
        context.beginPath();
        context.arc(avatarCenterX, avatarCenterY, avatarInnerRadius, 0, Math.PI * 2);
        context.closePath();
        context.clip();
        context.fillStyle = "rgba(0,0,0,0.65)";
        context.beginPath();
        context.arc(avatarCenterX + (24 - 32) * scale, avatarCenterY + (26 - 32) * scale, 4 * scale, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(avatarCenterX + (40 - 32) * scale, avatarCenterY + (26 - 32) * scale, 4 * scale, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "rgba(0,0,0,0.65)";
        context.lineWidth = 4 * scale;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(avatarCenterX + (24 - 32) * scale, avatarCenterY + (40 - 32) * scale);
        context.quadraticCurveTo(
          avatarCenterX + (32 - 32) * scale,
          avatarCenterY + (47 - 32) * scale,
          avatarCenterX + (40 - 32) * scale,
          avatarCenterY + (40 - 32) * scale
        );
        context.stroke();
        context.restore();
      };
      if (avatarUrl) {
        try {
          const avatarImage = new Image();
          avatarImage.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            avatarImage.onload = () => resolve();
            avatarImage.onerror = () => reject(new Error("Failed to load avatar image"));
            avatarImage.src = avatarUrl;
          });
          context.save();
          context.beginPath();
          context.arc(avatarCenterX, avatarCenterY, avatarInnerRadius, 0, Math.PI * 2);
          context.closePath();
          context.clip();
          context.drawImage(
            avatarImage,
            avatarCenterX - avatarInnerRadius,
            avatarCenterY - avatarInnerRadius,
            avatarInnerRadius * 2,
            avatarInnerRadius * 2
          );
          context.restore();
          avatarImageDrawn = true;
        } catch {
          // Fall back to the default smiley avatar.
        }
      }
      if (!avatarImageDrawn) {
        drawDefaultAvatarFace();
      }
      context.strokeStyle = qrCardTheme.borderColor ?? "#111827";
      context.lineWidth = 6;
      context.beginPath();
      context.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.fillStyle = qrCardTheme.cardText;
      context.textAlign = "center";
      context.font = "600 52px Arial";
      const maxHeaderWidth = cardWidth - 180;
      let headerText = cardDisplayName;
      while (headerText.length > 0 && context.measureText(headerText).width > maxHeaderWidth) {
        headerText = `${headerText.slice(0, -2).trimEnd()}...`;
      }
      context.fillText(headerText || cardDisplayName, exportWidth / 2, cardY + 195);

      drawRoundedRect(context, qrPanelX, qrPanelY, qrPanelSize, qrPanelSize, 62);
      context.fillStyle = "rgba(255,255,255,0.80)";
      context.fill();
      context.strokeStyle = "#d1d5db";
      context.lineWidth = 4;
      context.stroke();
      // Match the profile link tray's inset feel (`shadow-inner`) in canvas export.
      context.save();
      drawRoundedRect(context, qrPanelX, qrPanelY, qrPanelSize, qrPanelSize, 62);
      context.clip();
      drawRoundedRect(context, qrPanelX + 3, qrPanelY + 3, qrPanelSize - 6, qrPanelSize - 6, 59);
      context.strokeStyle = "rgba(17,24,39,0.12)";
      context.lineWidth = 6;
      context.stroke();
      const trayHighlight = context.createLinearGradient(0, qrPanelY, 0, qrPanelY + qrPanelSize);
      trayHighlight.addColorStop(0, "rgba(255,255,255,0.42)");
      trayHighlight.addColorStop(0.22, "rgba(255,255,255,0)");
      trayHighlight.addColorStop(1, "rgba(17,24,39,0.06)");
      context.fillStyle = trayHighlight;
      drawRoundedRect(context, qrPanelX + 2, qrPanelY + 2, qrPanelSize - 4, qrPanelSize - 4, 60);
      context.fill();
      context.restore();

      if (qrMemoLabel) {
        context.save();
        context.fillStyle = "#374151";
        context.font = "500 44px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const maxInlineMemoWidth = qrPanelSize - 120;
        let qrMemoExportText = qrMemoLabel;
        while (qrMemoExportText.length > 0 && context.measureText(qrMemoExportText).width > maxInlineMemoWidth) {
          qrMemoExportText = `${qrMemoExportText.slice(0, -2).trimEnd()}...`;
        }
        context.fillText(qrMemoExportText ?? qrMemoLabel, exportWidth / 2, qrPanelY + qrTextBandMidpoint);
        context.restore();
      }

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceContext = sourceCanvas.getContext("2d");
      if (sourceContext) {
        sourceContext.drawImage(image, 0, 0);
        const pixels = sourceContext.getImageData(0, 0, image.width, image.height).data;
        let minX = image.width;
        let minY = image.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < image.height; y += 1) {
          for (let x = 0; x < image.width; x += 1) {
            const idx = (y * image.width + x) * 4;
            const alpha = pixels[idx + 3];
            if (alpha === 0) continue;
            const red = pixels[idx];
            const green = pixels[idx + 1];
            const blue = pixels[idx + 2];
            if (red > 245 && green > 245 && blue > 245) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX >= minX && maxY >= minY) {
          sourceX = minX;
          sourceY = minY;
          sourceWidth = maxX - minX + 1;
          sourceHeight = maxY - minY + 1;
        }
      }
      context.imageSmoothingEnabled = false;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, qrX, qrY, qrSize, qrSize);

      if (qrRequestLine) {
        context.save();
        context.fillStyle = "#374151";
        context.font = "500 40px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const maxRequestWidth = qrPanelSize - 120;
        let requestLineText = qrRequestLine;
        while (requestLineText.length > 0 && context.measureText(requestLineText).width > maxRequestWidth) {
          requestLineText = `${requestLineText.slice(0, -2).trimEnd()}...`;
        }
        context.fillText(
          requestLineText ?? qrRequestLine,
          exportWidth / 2,
          qrPanelY + qrPanelSize - qrTextBandMidpoint
        );
        context.restore();
      }

      if (qrDetails.length > 0) {
        context.fillStyle = qrCardTheme.cardText;
        context.font = "500 52px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const maxDetailWidth = qrPanelSize - 120;
        qrDetails.forEach((line, index) => {
          let detailLine = line;
          while (detailLine.length > 0 && context.measureText(detailLine).width > maxDetailWidth) {
            detailLine = `${detailLine.slice(0, -2).trimEnd()}...`;
          }
          context.fillText(detailLine || line, exportWidth / 2, detailsStartY + index * detailsLineHeight);
        });
      }

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) return null;

      const filenameTicker = selectedTicker || "ticker";
      const filenameMemo = memoFilenameSnippet;
      const filenameAmount = qrAmountForFilename;
      const filename = `zcashme-${safeName || "recipient"}-${filenameTicker}-${filenameAmount}-${filenameMemo}-qr.png`;
      return { blob: pngBlob, filename };
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, [
    qrMemoLabel,
    qrRequestLine,
    cardDisplayName,
    memoFilenameSnippet,
    profile.display_name,
    profile.name,
    profile.profile_image_url,
    qrAmountForFilename,
    qrCardTheme.borderColor,
    qrCardTheme.cardText,
    qrDetails,
    effectiveQrCardSurfaceSolid,
    selectedTicker,
  ]);

  const handleSaveQr = useCallback(async () => {
    const exportData = await buildQrExport();
    if (!exportData) return;
    const downloadUrl = URL.createObjectURL(exportData.blob);
    const link = document.createElement("a");
    link.download = exportData.filename;
    link.href = downloadUrl;
    link.click();
    URL.revokeObjectURL(downloadUrl);

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }, [buildQrExport]);

  const handleShareQr = useCallback(async () => {
    try {
      const exportData = await buildQrExport();
      if (!exportData) return;
      const file = new File([exportData.blob], exportData.filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Zcash.me QR card",
          files: [file],
        });
      } else {
        const downloadUrl = URL.createObjectURL(exportData.blob);
        const link = document.createElement("a");
        link.download = exportData.filename;
        link.href = downloadUrl;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      }

      setSharedQr(true);
      window.setTimeout(() => setSharedQr(false), 1500);
    } catch {
      setSharedQr(false);
    }
  }, [
    buildQrExport,
  ]);
  const qrActionButtonSizeClass = isWideLayout ? "h-8 text-sm" : "h-9";
  const isMobileQrOpen = !isWideLayout && showQr;
  const qrTextBandTopHeightPx = isWideLayout ? 24 : 24;
  const qrTextBandBottomHeightPx = isWideLayout ? 24 : 24;
  const qrMatrixSizePx = isWideLayout ? 200 : 228;
  const qrAvatarSizePx = isWideLayout ? 48 : 56;
  const qrAvatarMaskWidthPx = qrAvatarSizePx + 6;
  const qrInlineFrameHeightPx = qrTextBandTopHeightPx + qrMatrixSizePx + qrTextBandBottomHeightPx;
  const qrTextBandTextClass = isWideLayout ? "text-[10px]" : "text-[11px]";
  const qrTextInsetPx = isWideLayout ? 3 : 4;
  const qrRequestInlineText = useMemo(
    () => (qrRequestLine ? formatQrInlineText(qrRequestLine, isWideLayout ? 38 : 52) : null),
    [qrRequestLine, isWideLayout]
  );
  const qrMemoInlineText = useMemo(
    () => (qrMemoLabel ? formatQrInlineText(qrMemoLabel, isWideLayout ? 42 : 56) : null),
    [qrMemoLabel, isWideLayout]
  );

  const qrPreviewPanel = (
    <div className="flex w-full flex-col items-center gap-2">
      <div
        className={`relative mx-auto w-full rounded-[26px] border p-3 text-center shadow-xs ${
          isWideLayout ? "mt-2 max-w-[300px] pt-8" : "mt-3 w-full max-w-[24rem] pt-8"
        } ${
          qrCardTheme.borderColor ? "border-[var(--verified-card-border)] hover:shadow-[0_0_10px_var(--verified-card-glow)]" : "border-black/70"
        }`}
        style={{
          background: qrPreviewCardBackground,
          color: qrCardTheme.cardText,
          "--verified-card-border": qrCardTheme.borderColor ?? undefined,
          "--verified-card-glow": qrCardTheme.borderColor ?? undefined,
        } as CSSProperties}
      >
        <div
          className="pointer-events-none absolute -top-[2px] left-1/2 z-0 h-[6px] -translate-x-1/2 rounded-b-full"
          style={{
            width: `${qrAvatarMaskWidthPx}px`,
            backgroundColor: effectiveQrCardSurfaceSolid,
          }}
          aria-hidden
        />
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <ProfileAvatar
            profile={profile}
            size={qrAvatarSizePx}
            borderColor={qrCardTheme.borderColor ?? "#111827"}
            lookAround={false}
          />
        </div>
        <p
          className={`font-semibold tracking-wide ${isWideLayout ? "mb-2 text-[11px]" : "mb-3 text-xs"} truncate`}
          title={cardDisplayName}
        >
          {cardDisplayName}
        </p>
        <div className={`relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-300 bg-white/80 px-2 py-2 shadow-inner transition-all ${
          isWideLayout ? "max-w-[240px]" : "max-w-[21rem]"
        }`}>
          <div className="relative w-full overflow-hidden" style={{ height: `${qrInlineFrameHeightPx}px` }}>
            <div
              className={`absolute inset-x-0 top-0 flex items-end justify-center overflow-hidden px-1 ${qrTextBandTextClass}`}
              style={{ height: `${qrTextBandTopHeightPx}px`, paddingBottom: `${qrTextInsetPx}px` }}
            >
              {qrMemoInlineText && (
                <p
                  className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-gray-700 leading-tight"
                  title={qrMemoLabel ?? undefined}
                >
                  {qrMemoInlineText}
                </p>
              )}
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: `${qrTextBandTopHeightPx}px`,
                width: `${qrMatrixSizePx}px`,
                height: `${qrMatrixSizePx}px`,
              }}
            >
              <QRCodeSVG
                ref={qrRef}
                value={previewUrl}
                size={qrMatrixSizePx}
                includeMargin={true}
                bgColor="transparent"
                fgColor="#000000"
                className="block"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div
              className={`absolute inset-x-0 bottom-0 flex items-start justify-center overflow-hidden px-1 ${qrTextBandTextClass}`}
              style={{ height: `${qrTextBandBottomHeightPx}px`, paddingTop: `${qrTextInsetPx}px` }}
            >
              {qrRequestInlineText && (
                <p
                  className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-gray-700 leading-tight"
                  title={qrRequestLine ?? undefined}
                >
                  {qrRequestInlineText}
                </p>
              )}
            </div>
          </div>
        </div>
        {qrDetails.length > 0 && (
          <div className={`border-t border-white/30 pt-2 ${isWideLayout ? "mt-2 text-[11px]" : "mt-3 text-xs"}`}>
            {qrDetails.map((line) => (
              <p key={line} className="truncate">{line}</p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-row">
        <motion.button
          type="button"
          onClick={handleSaveQr}
          {...tapProps}
          className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
        >
          {saved ? "Saved" : "Save QR"}
        </motion.button>
        <motion.button
          type="button"
          onClick={handleShareQr}
          {...tapProps}
          className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
        >
          {sharedQr ? "Shared" : "Share QR"}
        </motion.button>
      </div>
    </div>
  );

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-2 pb-2 pt-[6vh] sm:px-4 sm:pb-4 sm:items-center sm:pt-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className={`relative my-4 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${PROFILE_CARD_MODAL_CHROME_CLASSES}`}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Paylink
            </h2>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            {...tapProps}
            className={`${PROFILE_CARD_ICON_BUTTON_CLASSES} h-8 w-8 self-center`}
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <div className={isMobileQrOpen ? "p-3 sm:p-5" : "p-5"}>
          <div className={isWideLayout ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2" : "space-y-4"}>
            <div className="min-w-0">
          <motion.div
            initial={false}
            animate={isMobileQrOpen ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.08 }
                : { duration: 0.22, ease: "easeOut" as const }
            }
            className="overflow-hidden"
          >
            <div className="space-y-4">
          <div className="space-y-3">
            <label className="block min-w-0 text-sm text-gray-700">
              <span className="mb-1 block font-medium">
                Amount ({selectedTicker})
                {shouldShowSelectedBaseLayerInLabel && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    {selectedCryptoOption?.chainLabel ?? ""}
                  </span>
                )}
              </span>
              <div ref={tokenSelectorRef} className="relative w-full">
                <div className="flex h-11 items-center rounded-xl border border-black/30 bg-white/80 px-3 text-sm text-gray-900 shadow-xs transition-all focus-within:border-[var(--color-brand-blue)] focus-within:shadow-[0_0_0_2px_rgba(29,78,216,0.2)]">
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
                    className={`${PROFILE_CARD_INLINE_SELECTOR_TRIGGER_CLASSES} ml-2 h-6 shrink-0 text-md leading-none`}
                    aria-label="Choose crypto ticker"
                    aria-expanded={isTokenOpen}
                  >
                    <span className="leading-none">{selectedTicker}</span>
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
                  <div className="absolute left-0 top-full mt-1 z-[10000] w-full max-h-72 overflow-hidden rounded-xl border border-black/30 bg-white/95 shadow-xl backdrop-blur-xs">
                    <div className="border-b border-black/10 p-2">
                      <input
                        type="text"
                        value={tokenSearch}
                        onChange={(event) => setTokenSearch(event.target.value)}
                        placeholder="Search tokens..."
                        className="w-full rounded-lg border border-black/20 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/30"
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
                            className={`group flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30 focus-visible:ring-inset ${
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

            <label className="block min-w-0 text-sm text-gray-700">
              <span className="mb-1 block font-medium">Amount ({fiatTicker})</span>
              <div ref={fiatSelectorRef} className="relative w-full">
                <div className="flex h-11 items-center rounded-xl border border-black/30 bg-white/80 px-3 text-sm text-gray-900 shadow-xs transition-all focus-within:border-[var(--color-brand-blue)] focus-within:shadow-[0_0_0_2px_rgba(29,78,216,0.2)]">
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
                    className={`${PROFILE_CARD_INLINE_SELECTOR_TRIGGER_CLASSES} ml-2 h-6 shrink-0 text-md leading-none`}
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
                  <div className="absolute left-0 top-full mt-1 z-[10000] w-full max-h-72 overflow-hidden rounded-xl border border-black/30 bg-white/95 shadow-xl backdrop-blur-xs">
                    <div className="border-b border-black/10 p-2">
                      <input
                        type="text"
                        value={fiatSearch}
                        onChange={(event) => setFiatSearch(event.target.value)}
                        placeholder="Search currencies..."
                        className="w-full rounded-lg border border-black/20 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/30"
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
                            className={`group flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30 focus-visible:ring-inset ${
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
            {preMemoWarnings.length > 0 && (
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
                  {preMemoWarnings.map((warning) => (
                    <div
                      key={warning.key}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        warning.tone === "info"
                          ? "border-blue-200 bg-blue-50 text-blue-900"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {warning.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Memo
              </label>
            </div>
            <div className="relative">
              {canUseMemo && (
                <div className="absolute left-3 top-3 pointer-events-none text-gray-500 h-5 w-5 flex items-center justify-center">
                  <MemoLeftIcon text={memo} />
                </div>
              )}
              <textarea
                ref={memoTextareaRef}
                value={memo}
                onChange={(event) => {
                  setMemo(event.target.value);
                  emoji.update();
                  resizeMemoTextarea(event.target);
                }}
                onBlur={emoji.close}
                onKeyDown={emoji.handleKeyDown}
                rows={1}
                placeholder={canUseMemo ? "Thanks" : "Memo disabled for non-ZEC paylinks"}
                disabled={!canUseMemo}
                className={`w-full resize-none overflow-hidden rounded-xl border bg-white/80 py-2 text-sm shadow-xs focus:outline-none focus:border-[var(--color-brand-blue)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30 ${
                  canUseMemo
                    ? "border-gray-300 text-gray-900 pl-8 pr-3"
                    : "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed px-3"
                }`}
              />
            </div>

            {emoji.results.length > 0 && canUseMemo && (
              <div
                className={`absolute left-0 z-[10000] w-full max-h-48 overflow-y-auto rounded-xl border border-black/30 bg-white/95 shadow-xl backdrop-blur-xs ${
                  emoji.placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
                }`}
              >
                {emoji.results.map((item, idx) => (
                  <button
                    key={`${item.ch}-${item.label}-${idx}`}
                    ref={(el) => emoji.setOptionRef(idx, el)}
                    type="button"
                    className={`group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30 focus-visible:ring-inset ${
                      emoji.highlightedIndex === idx
                        ? "bg-[var(--color-brand-blue)]/90 text-white"
                        : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                    }`}
                    onMouseEnter={() => emoji.setHighlightedIndex(idx)}
                    onFocus={() => emoji.setHighlightedIndex(idx)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      emoji.insert(item);
                    }}
                  >
                    <span className="text-lg">{item.ch}</span>
                    <span
                      className={`truncate ${
                        emoji.highlightedIndex === idx
                          ? "text-white"
                          : "text-gray-700 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {notes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <div className="w-full">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preview
              </label>
              <p className="text-xs text-gray-700 break-all">
                {previewUrl}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                onClick={handleOpenPreview}
                {...tapProps}
                className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
              >
                Open URL
              </motion.button>
              <motion.button
                type="button"
                onClick={handleCopy}
                {...tapProps}
                className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
              >
                {copied ? "Copied" : "Copy URL"}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleShare}
                {...tapProps}
                className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
              >
                {shared ? "Shared" : "Share URL"}
              </motion.button>
              {!isWideLayout && (
                <motion.button
                  type="button"
                  onClick={() => setShowQr((prev) => !prev)}
                  {...tapProps}
                  className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
                >
                  {showQr ? "Hide QR" : "View QR"}
                </motion.button>
              )}
            </div>

          </div>
            </div>
          </motion.div>

          <AnimatePresence initial={false}>
            {isMobileQrOpen && (
              <motion.div
                key="mobile-qr-only"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.08 }
                    : { duration: 0.22, ease: "easeOut" as const }
                }
                className="overflow-hidden"
              >
                <div className="mt-2 flex w-full max-h-[calc(100dvh-10rem)] flex-col items-center gap-2 overflow-y-auto pt-6 pb-1">
                  {qrPreviewPanel}
                  <motion.button
                    type="button"
                    onClick={() => setShowQr(false)}
                    {...tapProps}
                    className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} ${qrActionButtonSizeClass}`}
                  >
                    Edit
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            </div>
            {isWideLayout && (
              <div className="border-l border-gray-200 pl-2">
                {qrPreviewPanel}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
