"use client";

import { useEffect, useState, useRef, useMemo, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { validate as validateMultichainAddress } from "multichain-address-validator";
import { getRateAction } from "@/lib/rates/getRateAction";
import { INLINE_SELECTOR_TRIGGER_CLASSES, OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";
import { withFieldBorderState } from "@/ui/common/forms/styles";

interface Currency {
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<string, Currency> = {
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
export const FIAT_TICKERS = Object.keys(CURRENCIES);
const FIAT_STATE_STORAGE_KEY = "zcashme.amountAndWallet.fiatState";
const ALLOWED_BASE_LAYER_PARTS = new Set([
  "btc",
  "bitcoin",
  "eth",
  "ethereum",
  "sol",
  "solana",
  "zec",
  "zcash",
]);

const formatDecimal = (value: number, fallback = "") => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
};

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

const sanitizeFiatPrefillAmount = (rawValue: string): string => {
  const value = rawValue.trim().replace(/,/g, "");
  const normalized = value.endsWith(".") ? value.slice(0, -1) : value;
  if (!normalized || normalized === ".") return "";
  if (!/^\d*\.?\d*$/.test(normalized)) return "";
  if (/^0\d+/.test(normalized)) return "";

  const parts = normalized.split(".");
  if (parts[1] && parts[1].length > 2) return "";

  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return "";
  return normalized;
};

interface TokenOption {
  id: string;
  symbol?: string;
  ticker?: string;
  label?: string;
  logo?: string;
  chain?: string;
}

const isAllowedTokenBaseLayer = (token: TokenOption) => {
  const rawChain = (token.chain ?? "").toLowerCase().trim();
  if (!rawChain) return false;

  const normalized = rawChain.replace(/[_/.\-]+/g, " ");
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.some((part) => ALLOWED_BASE_LAYER_PARTS.has(part))) return true;

  return (
    rawChain.includes("bitcoin") ||
    rawChain.includes("ethereum") ||
    rawChain.includes("solana") ||
    rawChain.includes("zcash")
  );
};

function getBaseLayerLabel(chainHint?: string): string {
  const raw = (chainHint ?? "").trim();
  if (!raw) return "";

  const chain = raw.toLowerCase();
  if (chain.includes("zec") || chain.includes("zcash")) return "Zcash";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "Bitcoin";
  if (chain.includes("eth") || chain.includes("ethereum")) return "Ethereum";
  if (chain.includes("sol") || chain.includes("solana")) return "Solana";
  if (chain.includes("tron")) return "Tron";
  if (chain.includes("stellar") || chain.includes("xlm")) return "Stellar";
  if (chain.includes("ripple") || chain.includes("xrp")) return "Ripple";

  return raw
    .replace(/[_./-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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
  disabled?: boolean;
  initialAutoOpenFiatFromAmount?: boolean;
  initialFiatTicker?: string;
  initialFiatAmount?: string;
  collapseUsdPillSignal?: string | number;

  // Token selector props (optional)
  asset?: string;
  assetDisplayLabel?: string;
  assetOptions?: TokenOption[];
  setAsset?: (_asset: string) => void;
  amountPlaceholder?: string;
  readOnlyAmount?: boolean;
  filterAllowedBaseLayers?: boolean;
  tokenSelectorAlign?: "right" | "left";
  fieldBackgroundClassName?: string;

  // Refund address props (optional)
  showRefund?: boolean;
  refundAddress?: string;
  setRefundAddress?: (_address: string) => void;
  recipientName?: string;
  onRefundValidationChange?: (_isValid: boolean) => void;
  validationTrigger?: string | number;
  betweenAmountAndRefund?: ReactNode;
}

function resolveValidationChain(assetSymbol: string, chainHint: string): string {
  const symbol = assetSymbol.toLowerCase();
  const chain = chainHint.toLowerCase().trim();

  // Prefer base-layer info from selected token chain first.
  if (chain.includes("zec") || chain.includes("zcash")) return "zec";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "bitcoin";
  if (chain.includes("eth") || chain.includes("ethereum")) return "ethereum";
  if (chain.includes("sol") || chain.includes("solana")) return "solana";
  if (chain.includes("tron") || chain.includes("trc")) return "tron";
  if (chain.includes("stellar") || chain.includes("xlm")) return "stellar";
  if (chain.includes("ripple") || chain.includes("xrp")) return "ripple";
  if (
    chain.includes("arb") ||
    chain.includes("base") ||
    chain.includes("optimism") ||
    chain.includes("avalanche") ||
    chain.includes("bsc") ||
    chain.includes("binance")
  ) {
    return "ethereum";
  }

  if (symbol === "btc") return "bitcoin";
  if (symbol === "eth") return "ethereum";
  if (symbol === "sol") return "solana";
  if (symbol === "zec") return "zec";
  if (symbol === "xrp") return "ripple";
  if (symbol === "xlm") return "stellar";
  if (symbol === "usdc" || symbol === "usdt") return "ethereum";

  return symbol;
}

export default function AmountAndWallet({
  amount,
  setAmount,
  openWallet,
  openWalletLabel = "Open in Wallet",
  showOpenWallet = true,
  showUsdPill = false,
  disabled = false,
  initialAutoOpenFiatFromAmount = false,
  initialFiatTicker = "",
  initialFiatAmount = "",
  collapseUsdPillSignal,
  // Token selector props (optional)
  asset = "ZEC",
  assetDisplayLabel,
  assetOptions = [],
  setAsset,
  amountPlaceholder = "0.0000",
  readOnlyAmount = false,
  filterAllowedBaseLayers = true,
  tokenSelectorAlign = "right",
  fieldBackgroundClassName = "",
  // Refund address props (optional)
  showRefund = false,
  refundAddress = "",
  setRefundAddress,
  recipientName = "recipient",
  onRefundValidationChange,
  validationTrigger,
  betweenAmountAndRefund,
}: AmountAndWalletProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isUsdOpen, setIsUsdOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [tokenDropdownPlacement, setTokenDropdownPlacement] = useState<"top" | "bottom">("bottom");
  const [tokenDropdownWidth, setTokenDropdownWidth] = useState<number | null>(null);
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
  const amountFieldRef = useRef<HTMLDivElement>(null);
  const tokenTriggerRef = useRef<HTMLButtonElement>(null);
  const fiatTriggerRef = useRef<HTMLButtonElement>(null);
  const [currencyDropdownPlacement, setCurrencyDropdownPlacement] = useState<"top" | "bottom">("bottom");
  const [preferFiatValue, setPreferFiatValue] = useState(false);
  const [fiatStateHydrated, setFiatStateHydrated] = useState(false);
  const [highlightedTokenIndex, setHighlightedTokenIndex] = useState(-1);
  const [highlightedFiatIndex, setHighlightedFiatIndex] = useState(-1);
  const tokenOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fiatOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasAppliedInitialFiatPrefill = useRef(false);
  const hasRequestedInitialAutoFiat = useRef(false);
  const hasAppliedInitialAutoFiat = useRef(false);
  const lastCollapseUsdPillSignal = useRef<string | number | undefined>(undefined);
  const shouldFocusUsdOnOpenRef = useRef(false);
  const usdInputRef = useRef<HTMLInputElement>(null);
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
  const resolveRateAssetSymbol = (assetValue: string) => {
    const normalized = (assetValue || "").trim();
    if (!normalized) return "ZEC";

    const matched = assetOptions.find(
      (token) =>
        normalized === token.id ||
        normalized === (token.symbol ?? token.ticker)
    );

    return (matched?.symbol || normalized).toUpperCase();
  };

  const fetchRate = async (nextFiat: string, nextAsset: string) => {
    try {
      const rateAsset = resolveRateAssetSymbol(nextAsset);
      const result = await getRateAction(nextFiat || "USD", rateAsset);
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
    if (!showUsdPill || !rateRequested) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchRate(fiat, asset);
    }, 60000);
    return () => clearInterval(id);
  }, [showUsdPill, rateRequested, fiat, asset]);

  useEffect(() => {
    if (!showUsdPill || !rateFetched || !isUsdOpen || isTypingFiat || preferFiatValue) return;
    const num = parseFloat(amount || "0");
    if (Number.isNaN(num)) return;
    setUsdInput(formatDecimal(num * rate));
  }, [showUsdPill, amount, rate, rateFetched, isUsdOpen, isTypingFiat, preferFiatValue]);

  useEffect(() => {
    if (!isUsdOpen || !rateFetched || !shouldFocusUsdOnOpenRef.current) return;
    shouldFocusUsdOnOpenRef.current = false;
    const el = usdInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [isUsdOpen, rateFetched]);

  useEffect(() => {
    if (showUsdPill) return;
    setIsUsdOpen(false);
    setIsCurrencyOpen(false);
    setRateRequested(false);
    setIsTypingFiat(false);
  }, [showUsdPill]);

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
    if (!showUsdPill || !fiatStateHydrated) return;
    if (hasAppliedInitialFiatPrefill.current) return;

    const normalizedTicker = initialFiatTicker.trim().toUpperCase();
    const normalizedAmount = sanitizeFiatPrefillAmount(initialFiatAmount);
    if (!normalizedTicker || !normalizedAmount) return;
    if (!FIAT_TICKERS.includes(normalizedTicker)) return;

    hasAppliedInitialFiatPrefill.current = true;
    setFiat(normalizedTicker);
    setUsdInput(normalizedAmount);
    setPreferFiatValue(true);
    setIsUsdOpen(true);
    setRateRequested(true);
    void fetchRate(normalizedTicker, asset);
  }, [
    showUsdPill,
    fiatStateHydrated,
    initialFiatTicker,
    initialFiatAmount,
    asset,
  ]);

  useEffect(() => {
    if (collapseUsdPillSignal === undefined || collapseUsdPillSignal === null) return;
    if (lastCollapseUsdPillSignal.current === collapseUsdPillSignal) return;
    lastCollapseUsdPillSignal.current = collapseUsdPillSignal;
    setIsUsdOpen(false);
    setIsCurrencyOpen(false);
    setIsTypingFiat(false);
  }, [collapseUsdPillSignal]);

  useEffect(() => {
    if (!showUsdPill || !fiatStateHydrated) return;
    if (!initialAutoOpenFiatFromAmount) return;
    if (hasAppliedInitialFiatPrefill.current) return;
    if (hasRequestedInitialAutoFiat.current) return;

    const initialAmount = Number.parseFloat(amount || "");
    if (!Number.isFinite(initialAmount) || initialAmount <= 0) return;

    hasRequestedInitialAutoFiat.current = true;
    setIsUsdOpen(true);
    setRateRequested(true);
    void fetchRate(fiat, asset);
  }, [
    showUsdPill,
    fiatStateHydrated,
    initialAutoOpenFiatFromAmount,
    amount,
    fiat,
    asset,
  ]);

  useEffect(() => {
    if (!showUsdPill || !initialAutoOpenFiatFromAmount) return;
    if (hasAppliedInitialFiatPrefill.current) return;
    if (hasAppliedInitialAutoFiat.current) return;
    if (!rateFetched || !isUsdOpen) return;

    const initialAmount = Number.parseFloat(amount || "");
    if (!Number.isFinite(initialAmount) || initialAmount <= 0) return;

    hasAppliedInitialAutoFiat.current = true;
    setUsdInput(formatDecimal(initialAmount * rate));
    setPreferFiatValue(true);
  }, [
    showUsdPill,
    initialAutoOpenFiatFromAmount,
    rateFetched,
    isUsdOpen,
    amount,
    rate,
  ]);

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
    if (!showUsdPill || !rateRequested) return;
    setRateFetched(false);
    void fetchRate(fiat, asset);
  }, [showUsdPill, fiat, asset, rateRequested]);

  useEffect(() => {
    if (!showUsdPill || !rateFetched || !isUsdOpen || !preferFiatValue) return;
    if (!usdInput || usdInput.endsWith(".")) return;
    const num = parseFloat(usdInput);
    if (!Number.isFinite(num)) return;
    const clamped = clamp(num, 0, 1000000);
    const cryptoAmount = rate > 0 ? clamped / rate : clamped;
    const formatted = cryptoAmount.toFixed(8).replace(/\.?0+$/, "");
    if (formatted === (amount || "")) return;
    setAmount(formatted);
  }, [showUsdPill, rateFetched, isUsdOpen, preferFiatValue, usdInput, rate, amount, setAmount]);

  const handleToggleUsd = () => {
    const nextOpen = !isUsdOpen;

    if (nextOpen) {
      shouldFocusUsdOnOpenRef.current = true;
      // Reopening fiat should not retrigger flows until the user actually edits the value.
      setPreferFiatValue(false);

      if (!rateRequested) {
        setRateRequested(true);
        void fetchRate(fiat, asset);
      }
    } else {
      shouldFocusUsdOnOpenRef.current = false;
    }

    setIsUsdOpen(nextOpen);
  };

  const handleToggleCurrency = () => {
    setIsCurrencyOpen((prev) => !prev);
  };

  const choosePlacement = (
    triggerEl: HTMLElement | null,
    preferredMenuHeight = 288
  ): "top" | "bottom" => {
    if (!triggerEl || typeof window === "undefined") return "bottom";
    const rect = triggerEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom);
    const spaceAbove = Math.max(0, rect.top);

    if (spaceBelow >= preferredMenuHeight && spaceAbove >= preferredMenuHeight) {
      return "bottom";
    }
    if (spaceAbove > spaceBelow) return "top";
    return "bottom";
  };

  useEffect(() => {
    if (!isTokenDropdownOpen) return;

    const updatePlacement = () => {
      setTokenDropdownPlacement(choosePlacement(tokenTriggerRef.current, 288));
      if (!isUsdOpen && tokenTriggerRef.current && amountFieldRef.current) {
        const triggerRect = tokenTriggerRef.current.getBoundingClientRect();
        const fieldRect = amountFieldRef.current.getBoundingClientRect();
        const measuredWidth = Math.max(180, Math.round(triggerRect.right - fieldRect.left));
        setTokenDropdownWidth(measuredWidth);
      } else {
        setTokenDropdownWidth(null);
      }
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isTokenDropdownOpen, isUsdOpen]);

  useEffect(() => {
    if (!isCurrencyOpen) return;

    const updatePlacement = () => {
      setCurrencyDropdownPlacement(choosePlacement(fiatTriggerRef.current, 288));
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isCurrencyOpen]);

  const matchesTokenSearch = (token: TokenOption) => {
    if (!tokenSearch) return true;
    const term = tokenSearch.toLowerCase();
    if (token.symbol?.toLowerCase().includes(term)) return true;
    if (token.label?.toLowerCase().includes(term)) return true;
    if (token.chain?.toLowerCase().includes(term)) return true;
    const chainLabel = getBaseLayerLabel(token.chain).toLowerCase();
    if (chainLabel.includes(term)) return true;
    return false;
  };

  const filteredTokenOptions = useMemo(
    () =>
      assetOptions
        .filter((token) => !filterAllowedBaseLayers || isAllowedTokenBaseLayer(token))
        .filter(matchesTokenSearch),
    [assetOptions, tokenSearch, filterAllowedBaseLayers], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const displayTokenOptions = useMemo(
    () =>
      filteredTokenOptions.map((token) => ({
        ...token,
        displayChain: getBaseLayerLabel(token.chain),
      })),
    [filteredTokenOptions]
  );

  const filteredFiatTickers = useMemo(() => {
    const search = fiatSearch.toLowerCase();
    return FIAT_TICKERS.filter(
      (ticker) =>
        !search ||
        ticker.toLowerCase().includes(search) ||
        CURRENCIES[ticker]?.name?.toLowerCase().includes(search) ||
        CURRENCIES[ticker]?.symbol?.toLowerCase().includes(search),
    );
  }, [fiatSearch]);
  const selectedToken = useMemo(
    () =>
      assetOptions.find(
        (token) => asset === token.id || asset === (token.symbol ?? token.ticker),
      ),
    [assetOptions, asset]
  );
  const refundValidationChain = useMemo(
    () => resolveValidationChain(asset, selectedToken?.chain ?? ""),
    [asset, selectedToken?.chain]
  );
  const refundValidationLabel = useMemo(
    () => getBaseLayerLabel(selectedToken?.chain) || asset,
    [selectedToken?.chain, asset]
  );
  const refundValidation = useMemo(() => {
    const trimmed = (refundAddress ?? "").trim();
    if (!showRefund || !trimmed) {
      return { isValid: false, message: "" };
    }

    try {
      const valid = validateMultichainAddress(trimmed, refundValidationChain);
      return {
        isValid: valid,
        message: valid
          ? `${asset} refund address looks valid.`
          : `${refundValidationLabel} refund address is not valid.`,
      };
    } catch {
      return {
        isValid: false,
        message: `${refundValidationLabel} refund address is not valid.`,
      };
    }
  }, [refundAddress, showRefund, refundValidationChain, asset, refundValidationLabel]);

  useEffect(() => {
    onRefundValidationChange?.(refundValidation.isValid);
  }, [onRefundValidationChange, refundValidation.isValid, amount, validationTrigger]);

  const getCurrentTokenIndex = () =>
    displayTokenOptions.findIndex(
      (token) => asset === token.id || asset === (token.symbol ?? token.ticker),
    );

  const selectTokenAtIndex = (index: number) => {
    const next = displayTokenOptions[index];
    if (!next || !setAsset) return;
    setAsset(next.id);
    setIsTokenDropdownOpen(false);
    setTokenSearch("");
  };

  const selectFiatAtIndex = (index: number) => {
    const next = filteredFiatTickers[index];
    if (!next) return;
    setFiat(next);
    setIsCurrencyOpen(false);
    setFiatSearch("");
  };

  const handleTokenDropdownKeyDown = (e: ReactKeyboardEvent) => {
    if (!setAsset || assetOptions.length === 0) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsTokenDropdownOpen(false);
      setTokenSearch("");
      return;
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();

    if (e.key === "Enter" || e.key === " ") {
      if (!isTokenDropdownOpen) {
        setIsTokenDropdownOpen(true);
        return;
      }
      if (e.key === "Enter" && highlightedTokenIndex >= 0) {
        selectTokenAtIndex(highlightedTokenIndex);
      }
      return;
    }

    if (!isTokenDropdownOpen) {
      setIsTokenDropdownOpen(true);
      return;
    }

    if (displayTokenOptions.length === 0) return;
    const delta = e.key === "ArrowDown" ? 1 : -1;
    setHighlightedTokenIndex((prev) => {
      const base = prev >= 0 ? prev : Math.max(getCurrentTokenIndex(), 0);
      return (base + delta + displayTokenOptions.length) % displayTokenOptions.length;
    });
  };

  const handleFiatDropdownKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsCurrencyOpen(false);
      setFiatSearch("");
      return;
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();

    if (e.key === "Enter" || e.key === " ") {
      if (!isCurrencyOpen) {
        setIsCurrencyOpen(true);
        return;
      }
      if (e.key === "Enter" && highlightedFiatIndex >= 0) {
        selectFiatAtIndex(highlightedFiatIndex);
      }
      return;
    }

    if (!isCurrencyOpen) {
      setIsCurrencyOpen(true);
      return;
    }

    if (filteredFiatTickers.length === 0) return;
    const delta = e.key === "ArrowDown" ? 1 : -1;
    setHighlightedFiatIndex((prev) => {
      const selectedIndex = filteredFiatTickers.findIndex((ticker) => ticker === fiat);
      const base = prev >= 0 ? prev : Math.max(selectedIndex, 0);
      return (base + delta + filteredFiatTickers.length) % filteredFiatTickers.length;
    });
  };

  useEffect(() => {
    tokenOptionRefs.current = [];
    if (!isTokenDropdownOpen || displayTokenOptions.length === 0) {
      setHighlightedTokenIndex(-1);
      return;
    }

    setHighlightedTokenIndex((prev) => {
      if (prev >= 0 && prev < displayTokenOptions.length) return prev;
      const selectedIndex = getCurrentTokenIndex();
      return selectedIndex >= 0 ? selectedIndex : 0;
    });
  }, [isTokenDropdownOpen, displayTokenOptions, asset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isTokenDropdownOpen || highlightedTokenIndex < 0) return;
    const el = tokenOptionRefs.current[highlightedTokenIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [isTokenDropdownOpen, highlightedTokenIndex]);

  useEffect(() => {
    fiatOptionRefs.current = [];
    if (!isCurrencyOpen || filteredFiatTickers.length === 0) {
      setHighlightedFiatIndex(-1);
      return;
    }

    setHighlightedFiatIndex((prev) => {
      if (prev >= 0 && prev < filteredFiatTickers.length) return prev;
      const selectedIndex = filteredFiatTickers.findIndex((ticker) => ticker === fiat);
      return selectedIndex >= 0 ? selectedIndex : 0;
    });
  }, [isCurrencyOpen, filteredFiatTickers, fiat]);

  useEffect(() => {
    if (!isCurrencyOpen || highlightedFiatIndex < 0) return;
    const el = fiatOptionRefs.current[highlightedFiatIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [isCurrencyOpen, highlightedFiatIndex]);

  const getDropdownMotion = (placement: "top" | "bottom") => {
    const yOffset = placement === "top" ? 8 : -8;
    return {
      initial: { opacity: 0, y: yOffset, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: yOffset, scale: 0.98 },
      transition: shouldReduceMotion
        ? { duration: 0.08 }
        : { duration: 0.18, ease: "easeOut" as const },
    };
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
            ref={amountFieldRef}
            className="relative min-w-0 max-w-full transition-[width] duration-200 box-border"
            style={showUsdPill ? { width: leftPillWidth } : { width: "100%" }}
          >
            <input
              type="text"
              inputMode={readOnlyAmount ? "text" : "decimal"}
              placeholder={amountPlaceholder}
              value={amount || ""}
              readOnly={readOnlyAmount}
              disabled={disabled}
              onChange={(e) => {
                if (disabled || readOnlyAmount) return;
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
                         text-md ${
                           tokenSelectorAlign === "left"
                             ? "pr-3 md:pr-3 pl-3"
                             : "pr-12 md:pr-16 pl-3"
                         } text-gray-900
                         outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${withFieldBorderState("border-gray-800")} ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : fieldBackgroundClassName}`}
            />

            {/* Right-side token selector */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center text-gray-500 text-md token-selector pointer-events-none ${
                tokenSelectorAlign === "left" ? "left-3 md:left-4" : "right-3 md:right-4"
              }`}
            >
              {setAsset && assetOptions.length > 0 ? (
                <div className="pointer-events-auto">
                  <button
                    ref={tokenTriggerRef}
                    type="button"
                    onClick={() => {
                      setIsTokenDropdownOpen(!isTokenDropdownOpen);
                    }}
                    onKeyDown={handleTokenDropdownKeyDown}
                    className="flex items-center gap-1 hover:text-[var(--color-brand-blue)] cursor-pointer"
                  >
                    <span>{assetDisplayLabel ?? asset}</span>
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
            <AnimatePresence>
              {setAsset && assetOptions.length > 0 && isTokenDropdownOpen && (
                <motion.div
                  {...getDropdownMotion(tokenDropdownPlacement)}
                  onKeyDown={handleTokenDropdownKeyDown}
                  className={`absolute left-0 max-h-72 overflow-hidden bg-[var(--color-background)] border border-gray-800 rounded-xl shadow-lg z-50 pointer-events-auto token-selector ${
                    tokenDropdownPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"
                  }`}
                  style={{ width: tokenDropdownWidth ? `${tokenDropdownWidth}px` : "16rem" }}
                >
                  {tokenDropdownPlacement === "bottom" && (
                    <div className="p-2 border-b border-gray-800">
                      <input
                        type="text"
                        value={tokenSearch}
                        onChange={(e) => setTokenSearch(e.target.value)}
                        onKeyDown={handleTokenDropdownKeyDown}
                        placeholder="Search tokens..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                  )}
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {displayTokenOptions
                      .map((token, tokenIndex) => {
                        const isRowActive = highlightedTokenIndex === tokenIndex;
                        const isSelectedToken =
                          asset === token.id || asset === (token.symbol ?? token.ticker);
                        return (
                        <motion.button
                          key={token.id}
                          ref={(el) => {
                            tokenOptionRefs.current[tokenIndex] = el;
                          }}
                          type="button"
                          onClick={() => {
                            setAsset(token.id);
                            setIsTokenDropdownOpen(false);
                            setTokenSearch("");
                          }}
                          onMouseEnter={() => setHighlightedTokenIndex(tokenIndex)}
                          onFocus={() => setHighlightedTokenIndex(tokenIndex)}
                          {...tapProps}
                          className={`group w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                            isRowActive
                              ? "bg-[var(--color-brand-blue)]/90 text-white"
                              : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
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
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`font-semibold truncate ${
                                  isRowActive
                                    ? "text-white"
                                    : isSelectedToken
                                      ? "text-gray-900"
                                      : "text-gray-800 group-hover:text-white"
                                }`}
                              >
                                {token.symbol}
                              </span>
                              {token.displayChain && (
                                <span
                                  className={`ml-auto text-xs text-right truncate font-medium ${
                                    isRowActive
                                      ? "text-white"
                                      : "text-gray-500 group-hover:text-white"
                                  }`}
                                >
                                  {token.displayChain}
                                </span>
                              )}
                            </div>
                          </span>
                        </motion.button>
                      )})}
                    {displayTokenOptions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No tokens found
                      </div>
                    )}
                  </div>
                  {tokenDropdownPlacement === "top" && (
                    <div className="p-2 border-t border-gray-800">
                      <input
                        type="text"
                        value={tokenSearch}
                        onChange={(e) => setTokenSearch(e.target.value)}
                        onKeyDown={handleTokenDropdownKeyDown}
                        placeholder="Search tokens..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showUsdPill && (
            <div
              className={`relative flex items-center border border-l-0 border-gray-800 rounded-r-xl text-gray-500 text-md h-11 min-w-0 max-w-full transition-[width] duration-200 box-border ${isUsdOpen ? "px-3" : "px-3 justify-center"
                } ${fieldBackgroundClassName}`}
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
                      ref={usdInputRef}
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
                        ref={fiatTriggerRef}
                        type="button"
                        {...tapProps}
                        className={INLINE_SELECTOR_TRIGGER_CLASSES}
                        aria-label="Choose fiat currency"
                        onClick={handleToggleCurrency}
                        onKeyDown={handleFiatDropdownKeyDown}
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
                      <AnimatePresence>
                        {isCurrencyOpen && (
                          <motion.div
                            {...getDropdownMotion(currencyDropdownPlacement)}
                            onKeyDown={handleFiatDropdownKeyDown}
                            className={`absolute right-0 w-64 max-h-72 overflow-hidden bg-[var(--color-background)] border border-gray-800 rounded-xl shadow-lg z-[9999] ${
                              currencyDropdownPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"
                            }`}
                          >
                            {currencyDropdownPlacement === "bottom" && (
                              <div className="p-2 border-b border-gray-800">
                                <input
                                type="text"
                                value={fiatSearch}
                                onChange={(e) => setFiatSearch(e.target.value)}
                                onKeyDown={handleFiatDropdownKeyDown}
                                placeholder="Search currencies..."
                                className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                              />
                            </div>
                          )}
                            <div className="py-1 max-h-60 overflow-y-auto">
                              {filteredFiatTickers.map((ticker, fiatIndex) => {
                                const isRowActive = highlightedFiatIndex === fiatIndex;
                                const isSelectedFiat = fiat === ticker;
                                return (
                                <motion.button
                                  key={ticker}
                                  ref={(el) => {
                                    fiatOptionRefs.current[fiatIndex] = el;
                                  }}
                                  type="button"
                                  onClick={() => {
                                    setFiat(ticker);
                                    setIsCurrencyOpen(false);
                                    setFiatSearch("");
                                  }}
                                  onMouseEnter={() => setHighlightedFiatIndex(fiatIndex)}
                                  onFocus={() => setHighlightedFiatIndex(fiatIndex)}
                                  {...tapProps}
                                  className={`group w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                    isRowActive
                                      ? "bg-[var(--color-brand-blue)]/90 text-white"
                                      : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                                  }`}
                                >
                                  <span
                                  className={`w-6 flex-shrink-0 ${
                                      isRowActive
                                        ? "text-white"
                                        : "text-gray-600 group-hover:text-white"
                                    }`}
                                  >
                                    {CURRENCIES[ticker]?.symbol || ""}
                                  </span>
                                  <span
                                    className={`font-medium flex-shrink-0 ${
                                      isRowActive
                                        ? "text-white"
                                        : isSelectedFiat
                                          ? "text-gray-900"
                                          : "text-gray-800 group-hover:text-white"
                                    }`}
                                  >
                                    {ticker}
                                  </span>
                                  <span
                                    className={`ml-auto text-xs text-right truncate flex-1 min-w-0 ${
                                      isRowActive
                                        ? "text-white"
                                        : "text-gray-500 group-hover:text-white"
                                    }`}
                                  >
                                    {CURRENCIES[ticker]?.name || ""}
                                  </span>
                                </motion.button>
                              )})}
                              {filteredFiatTickers.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                  No currencies found
                                </div>
                              )}
                            </div>
                            {currencyDropdownPlacement === "top" && (
                              <div className="p-2 border-t border-gray-800">
                                <input
                                type="text"
                                value={fiatSearch}
                                onChange={(e) => setFiatSearch(e.target.value)}
                                onKeyDown={handleFiatDropdownKeyDown}
                                placeholder="Search currencies..."
                                className="w-full px-2 py-1.5 text-sm border border-gray-800 rounded-lg bg-white text-gray-900 placeholder-gray-500 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
                              />
                            </div>
                          )}
                          </motion.div>
                        )}
                      </AnimatePresence>
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
            disabled={disabled}
            {...tapProps}
            className={`${OUTLINE_ACTION_BUTTON_CLASSES} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {openWalletLabel}
          </motion.button>
        )}
      </div>

      {betweenAmountAndRefund && <div className="mt-3">{betweenAmountAndRefund}</div>}

      <AnimatePresence initial={false}>
        {showRefund && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.08 }
                : { duration: 0.18, ease: "easeOut" as const }
            }
            className="w-full mt-3 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {isRefundFocused && (
                <motion.label
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.08 }
                      : { duration: 0.18, ease: "easeOut" as const }
                  }
                  className="block text-sm font-medium text-gray-700 mb-1 overflow-hidden"
                >
                  {asset} is returned to you if swap fails ({recipientName} does not receive ZEC).
                </motion.label>
              )}
            </AnimatePresence>
            <input
              type="text"
              value={refundAddress}
              onChange={(e) => setRefundAddress?.(e.target.value)}
              onFocus={() => setIsRefundFocused(true)}
              onBlur={() => setIsRefundFocused(false)}
              placeholder={`${refundValidationLabel} address for refunds`}
              className={`w-full border px-3 py-2 rounded-xl text-md text-gray-900 outline-hidden ${withFieldBorderState("border-gray-800")}`}
            />
            <AnimatePresence initial={false}>
              {refundValidation.message ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.08 }
                      : { duration: 0.18, ease: "easeOut" as const }
                  }
                  className={`mt-1 text-xs ${
                    refundValidation.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {refundValidation.message}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
