"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token, SwapContextQuoteData, SwapQuoteDisplay } from "@/lib/swap/types";


// Swap utilities
import { getTokenId } from "@/lib/swap/utils";

// Server actions
import { getSwapQuote, confirmSwap } from "@/lib/swap/oneClick";

// UI Components
import ProfileCard from "@/ui/profile/ProfileCard";
import MemoComposer from "@/ui/messaging/MemoComposer";
import ProfileVerification from "@/ui/verification/ProfileVerification";
import SwapComposer from "@/ui/swap/SwapComposer";
import { resolveProfilePageBackgroundColor } from "@/lib/profile/profileCardTheme";

interface ProfilePageProps {
  initialProfile: Profile;
  tokens: Token[];
  duplicateNameCount?: number;
  initialPrefill?: {
    memo: string;
    donateAmount: string;
    swapTicker: string;
    swapBaseLayer: string;
    swapAmount: string;
    fiatTicker: string;
    fiatAmount: string;
  };
}

type BaseLayerKey = "zec" | "btc" | "eth" | "sol";
const COMPOSER_MAX_WIDTH_PX = 512;
const PROFILE_CARD_DESKTOP_WIDTH_RATIO = 460 / COMPOSER_MAX_WIDTH_PX;
const PROFILE_CARD_DESKTOP_WIDTH_PX = Math.round(
  COMPOSER_MAX_WIDTH_PX * PROFILE_CARD_DESKTOP_WIDTH_RATIO
);

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

function isTruthyLikeAddressVerified(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

function getBaseLayerKey(blockchain?: string): BaseLayerKey | null {
  const chain = (blockchain ?? "").toLowerCase();
  if (chain.includes("zec") || chain.includes("zcash")) return "zec";
  if (chain.includes("btc") || chain.includes("bitcoin")) return "btc";
  if (chain.includes("eth") || chain.includes("ethereum")) return "eth";
  if (chain.includes("sol") || chain.includes("solana")) return "sol";
  return null;
}

function normalizeBaseLayerKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_\s./-]+/g, "");
  if (!normalized) return "";
  if (normalized.includes("bitcoin") || normalized.includes("btc")) return "btc";
  if (normalized.includes("ethereum") || normalized.includes("eth")) return "eth";
  if (normalized.includes("solana") || normalized.includes("sol")) return "sol";
  if (normalized.includes("zcash") || normalized.includes("zec")) return "zec";
  if (normalized.includes("tron") || normalized.includes("trx")) return "tron";
  return normalized;
}

function tokenMatchesBaseLayer(token: Token, requestedBaseLayer: string): boolean {
  if (!requestedBaseLayer) return true;
  const requestedKey = normalizeBaseLayerKey(requestedBaseLayer);
  if (!requestedKey) return true;

  const tokenBlockchain = token.blockchain || "";
  const tokenKey = normalizeBaseLayerKey(tokenBlockchain);
  if (tokenKey && tokenKey === requestedKey) return true;

  return tokenBlockchain.toLowerCase().includes(requestedBaseLayer.toLowerCase());
}

function resolvePrefillOriginTokenId(
  tokens: Token[],
  ticker: string,
  requestedBaseLayer: string
): string | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker || normalizedTicker === "ZEC") return null;

  const matches = tokens.filter((token) => token.symbol.toUpperCase() === normalizedTicker);
  if (matches.length === 0) return null;

  if (requestedBaseLayer) {
    const layered = matches.find((token) => tokenMatchesBaseLayer(token, requestedBaseLayer));
    if (layered) {
      const layeredId = getTokenId(layered);
      if (layeredId) return layeredId;
    }
  }

  for (const token of matches) {
    const tokenId = getTokenId(token);
    if (tokenId) return tokenId;
  }

  return null;
}

export default function ProfilePage({
  initialProfile,
  tokens,
  duplicateNameCount,
  initialPrefill,
}: ProfilePageProps) {
  const isMaxi = isTruthyLikeAddressVerified(initialProfile.is_maxi);
  const pageBackground = useMemo(
    () => resolveProfilePageBackgroundColor(isMaxi ? initialProfile.profile_page_bkgd : "none").background,
    [isMaxi, initialProfile.profile_page_bkgd]
  );
  const hasAutoScrolledPrefillRef = useRef(false);
  const pageBottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const isTouchingRef = useRef(false);
  const lastUserScrollIntentAtRef = useRef(0);
  const programmaticScrollUntilRef = useRef(0);
  const autoScrollTimeoutsRef = useRef<number[]>([]);
  const autoScrollRafRef = useRef<number | null>(null);
  const prefilledOriginTokenId = resolvePrefillOriginTokenId(
    tokens,
    initialPrefill?.swapTicker ?? "",
    initialPrefill?.swapBaseLayer ?? ""
  );
  const hasInitialPrefill = Boolean(
    initialPrefill?.memo ||
      initialPrefill?.donateAmount ||
      initialPrefill?.swapTicker ||
      initialPrefill?.swapAmount ||
      initialPrefill?.fiatTicker ||
      initialPrefill?.fiatAmount
  );
  const shouldSeedFiatFromInitialSwapAmount = Boolean(
    initialPrefill?.swapTicker &&
    initialPrefill.swapAmount &&
    !initialPrefill.fiatAmount
  );
  const feedbackTopPaddingPx = 32;
  const feedbackTopMarginPx = 40;
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Local swap form state (previously in global store)
  const [swapForm, setSwapForm] = useState(() => ({
    amount: initialPrefill?.swapAmount ?? '',
    refundAddress: '',
    slippageTolerance: '1',
  }));

  // Local quote state
  const [quoteState, setQuoteState] = useState<{
    quoteData: SwapContextQuoteData;
    quotePreview: SwapQuoteDisplay | null;
    depositUri: string;
    statusKey: { depositAddress: string } | null;
    quoteStatus: string;
    swapError: string;
  }>({
    quoteData: null,
    quotePreview: null,
    depositUri: '',
    statusKey: null,
    quoteStatus: '',
    swapError: '',
  });

  // Local memo form state
  const [memoForm, setMemoForm] = useState(() => ({
    memo: initialPrefill?.memo ?? '',
    amount: initialPrefill?.donateAmount ?? '',
  }));

  // Force show QR state
  const [forceShowQR, setForceShowQR] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [designPanelBackgroundPreview, setDesignPanelBackgroundPreview] = useState<string | null>(null);
  const [verificationGenerateQrTrigger, setVerificationGenerateQrTrigger] = useState(0);

  const [originTokenId, setOriginTokenId] = useState<string | null>(prefilledOriginTokenId);

  // Extract local state values
  const swapAmount = swapForm.amount;
  const refundAddress = swapForm.refundAddress;
  const slippageTolerance = swapForm.slippageTolerance;
  const { quoteData, quotePreview, depositUri, statusKey, quoteStatus, swapError } = quoteState;
  const effectivePageBackground = designPanelBackgroundPreview ?? pageBackground;

  // Token selection
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const selectedToken = tokens.find((t) => getTokenId(t) === originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";
  const isZecSelection =
    !selectedToken ||
    (selectedToken.symbol.toUpperCase() === "ZEC" &&
      selectedToken.blockchain.toLowerCase().includes("zec"));
  const mode: "donate" | "swap" | "verification" = isProfileEditing
    ? "verification"
    : isZecSelection
      ? "donate"
      : "swap";
  const memoAssetOptions = useMemo(() => {
    const allowed = tokens
      .map((token) => {
        const baseLayer = getBaseLayerKey(token.blockchain);
        if (!baseLayer) return null;

        return {
          id: getTokenId(token) ?? "",
          symbol: token.symbol,
          logo: token.logo,
          chain: BASE_LAYER_LABELS[baseLayer],
          baseLayer,
        };
      })
      .filter((token): token is {
        id: string;
        symbol: string;
        logo: string | undefined;
        chain: string;
        baseLayer: BaseLayerKey;
      } => Boolean(token && token.id && token.symbol));

    return allowed.sort((a, b) => {
      const aSymbol = a.symbol.toUpperCase();
      const bSymbol = b.symbol.toUpperCase();

      if (aSymbol === "ZEC" && bSymbol !== "ZEC") return -1;
      if (bSymbol === "ZEC" && aSymbol !== "ZEC") return 1;

      const layerDiff =
        BASE_LAYER_SORT_ORDER[a.baseLayer] - BASE_LAYER_SORT_ORDER[b.baseLayer];
      if (layerDiff !== 0) return layerDiff;

      return aSymbol.localeCompare(bSymbol);
    });
  }, [tokens]);
  const markUserScrollIntent = useCallback(() => {
    lastUserScrollIntentAtRef.current = Date.now();
  }, []);

  const clearPendingAutoScrollJobs = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    for (const timeoutId of autoScrollTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    autoScrollTimeoutsRef.current = [];
  }, []);

  const shouldAllowAutoScroll = useCallback(() => {
    const AUTO_SCROLL_COOLDOWN_MS = 700;
    return !isTouchingRef.current && Date.now() - lastUserScrollIntentAtRef.current >= AUTO_SCROLL_COOLDOWN_MS;
  }, []);

  const runMultiPassScroll = useCallback((scrollFn: () => void) => {
    clearPendingAutoScrollJobs();

    const runPass = () => {
      if (!shouldAllowAutoScroll()) return;
      programmaticScrollUntilRef.current = Date.now() + 450;
      scrollFn();
    };

    runPass();
    autoScrollRafRef.current = window.requestAnimationFrame(() => {
      autoScrollRafRef.current = null;
      runPass();
    });
    autoScrollTimeoutsRef.current.push(window.setTimeout(runPass, 120));
    autoScrollTimeoutsRef.current.push(window.setTimeout(runPass, 280));
  }, [clearPendingAutoScrollJobs, shouldAllowAutoScroll]);

  useEffect(() => {
    const onTouchStart = () => {
      isTouchingRef.current = true;
      markUserScrollIntent();
      clearPendingAutoScrollJobs();
    };
    const onTouchMove = () => {
      isTouchingRef.current = true;
      markUserScrollIntent();
      clearPendingAutoScrollJobs();
    };
    const onTouchEnd = () => {
      isTouchingRef.current = false;
      markUserScrollIntent();
    };
    const onWheel = () => markUserScrollIntent();
    const onScroll = () => {
      if (Date.now() < programmaticScrollUntilRef.current) return;
      markUserScrollIntent();
      clearPendingAutoScrollJobs();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearPendingAutoScrollJobs();
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
    };
  }, [clearPendingAutoScrollJobs, markUserScrollIntent]);

  // Handlers
  const handleGenerateVerificationQr = useCallback(() => {
    setVerificationGenerateQrTrigger((prev) => prev + 1);
    setTimeout(() => {
      runMultiPassScroll(() => {
        const el = document.getElementById("zcash-feedback");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 500);
  }, [runMultiPassScroll]);

  const handleSetAsset = useCallback((tokenId: string) => {
    setOriginTokenId(tokenId);
    const token = tokens.find((t) => getTokenId(t) === tokenId);
    const isZecSelection =
      !token ||
      (token.symbol.toUpperCase() === "ZEC" &&
        token.blockchain.toLowerCase().includes("zec"));
    setSwapForm(prev =>
      isZecSelection
        ? { ...prev, amount: "", refundAddress: "" }
        : { ...prev, refundAddress: "" }
    );
    setQuoteState(prev => ({
      ...prev,
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      swapError: '',
    }));
  }, [setOriginTokenId, tokens]);

  const handleGetQuote = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    setIsGettingQuote(true);
    setQuoteState(prev => ({ ...prev, quoteStatus: "Getting quote...", swapError: "" }));

    try {
      const result = await getSwapQuote({
        fromToken: params.fromToken ?? originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swapForm.refundAddress,
        slippageTolerance: params.slippage ?? swapForm.slippageTolerance,
        tokens,
      });

      if (result.ok) {
        setQuoteState(prev => ({
          ...prev,
          quoteData: result,
          quotePreview: result.data.display,
          quoteStatus: "",
        }));
      } else {
        setQuoteState(prev => ({
          ...prev,
          swapError: result.error,
          quoteStatus: "",
        }));
      }

      return result;
    } finally {
      setIsGettingQuote(false);
    }
  }, [originTokenId, zecTokenId, tokens, swapForm.refundAddress, swapForm.slippageTolerance]);

  const handleConfirmSwap = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    setIsConfirming(true);
    setQuoteState(prev => ({ ...prev, swapError: "" }));

    try {
      const result = await confirmSwap({
        fromToken: params.fromToken ?? originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swapForm.refundAddress,
        slippageTolerance: params.slippage ?? swapForm.slippageTolerance,
        tokens,
      });

      if (result.ok) {
        setQuoteState(prev => ({
          ...prev,
          quoteData: result,
          depositUri: result.data.paymentUri,
          statusKey: result.data.statusKey,
        }));
      } else {
        setQuoteState(prev => ({
          ...prev,
          swapError: result.error,
        }));
      }

      return result;
    } finally {
      setIsConfirming(false);
    }
  }, [originTokenId, zecTokenId, tokens, swapForm.refundAddress, swapForm.slippageTolerance]);

  const handleSwapFieldChange = useCallback((field: 'amount' | 'refund' | 'slippage') => (value: string) => {
    if (field === 'amount') {
      setSwapForm(prev => ({ ...prev, amount: value }));
    } else if (field === 'refund') {
      setSwapForm(prev => ({ ...prev, refundAddress: value }));
    } else {
      setSwapForm(prev => ({ ...prev, slippageTolerance: value }));
    }
    // Reset quote when form changes
    setQuoteState(prev => ({
      ...prev,
      quoteData: null,
      quotePreview: null,
      depositUri: '',
      statusKey: null,
      quoteStatus: '',
      swapError: '',
    }));
  }, []);

  const handleResetSwapProgress = useCallback(() => {
    setQuoteState(prev => ({
      ...prev,
      quoteData: null,
      quotePreview: null,
      depositUri: '',
      statusKey: null,
      quoteStatus: '',
      swapError: '',
    }));
  }, []);

  const handleShowQR = useCallback(() => {
    setForceShowQR(true);
    setTimeout(() => {
      runMultiPassScroll(() => {
        const el = document.getElementById("zcash-feedback");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }, 200);
  }, [runMultiPassScroll]);

  useEffect(() => {
    if (!hasInitialPrefill) return;
    if (hasAutoScrolledPrefillRef.current) return;
    hasAutoScrolledPrefillRef.current = true;

    runMultiPassScroll(() => {
      pageBottomSentinelRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      const bottom = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      window.scrollTo({ top: bottom, behavior: "auto" });
    });
  }, [hasInitialPrefill, runMultiPassScroll]);

  useEffect(() => {
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousColorBackgroundVar = document.documentElement.style.getPropertyValue("--color-background");

    document.body.style.backgroundColor = effectivePageBackground;
    document.documentElement.style.backgroundColor = effectivePageBackground;
    document.documentElement.style.setProperty("--color-background", effectivePageBackground);
    document.body.style.backgroundImage = "";
    document.documentElement.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.documentElement.style.backgroundSize = "";

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundImage = "";
      document.documentElement.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.documentElement.style.backgroundSize = "";
      if (previousColorBackgroundVar) {
        document.documentElement.style.setProperty("--color-background", previousColorBackgroundVar);
      } else {
        document.documentElement.style.removeProperty("--color-background");
      }
    };
  }, [effectivePageBackground, designPanelBackgroundPreview]);

  return (
    <div
      className="w-full min-h-screen overflow-x-hidden"
      style={{ backgroundColor: effectivePageBackground }}
    >
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-10 -mt-6 min-h-screen">
        <ProfileCard
          profile={initialProfile}
          fullView
          duplicateNameCount={duplicateNameCount}
          onShowQR={handleShowQR}
          onEditorModeChange={setIsProfileEditing}
          onDesignPanelBackgroundChange={setDesignPanelBackgroundPreview}
          onGenerateVerificationQr={handleGenerateVerificationQr}
          cardWidthPx={PROFILE_CARD_DESKTOP_WIDTH_PX}
        />

        <div
          id="zcash-feedback"
          className="border-t"
          style={{
            marginTop: `${feedbackTopMarginPx}px`,
            paddingTop: `${feedbackTopPaddingPx}px`
          }}
        >
          <div className="w-full flex justify-center">
            <div className="w-full" style={{ maxWidth: `${COMPOSER_MAX_WIDTH_PX}px` }}>
              {mode === "verification" ? (
                <ProfileVerification
                  profile={initialProfile}
                  generateQrTrigger={verificationGenerateQrTrigger}
                />
              ) : mode === "swap" ? (
                <div className="p-0">
                  <SwapComposer
                    profile={initialProfile}
                    tokenOptions={tokens}
                    originSymbol={originSymbol}
                    autoOpenFiatFromAmount={shouldSeedFiatFromInitialSwapAmount}
                    prefillFiatTicker={initialPrefill?.fiatTicker ?? ""}
                    prefillFiatAmount={initialPrefill?.fiatAmount ?? ""}
                    swapAmount={swapAmount}
                    refundAddress={refundAddress}
                    slippageTolerance={slippageTolerance}
                    quotePreview={quotePreview}
                    quoteData={quoteData}
                    depositUri={depositUri}
                    statusKey={statusKey}
                    isGettingQuote={isGettingQuote}
                    isConfirming={isConfirming}
                    quoteStatus={quoteStatus}
                    swapError={swapError}
                    resetSwapProgress={handleResetSwapProgress}
                    setToken={handleSetAsset}
                    setSwapAmount={handleSwapFieldChange('amount')}
                    setRefundAddress={handleSwapFieldChange('refund')}
                    setSlippageTolerance={handleSwapFieldChange('slippage')}
                    getQuote={handleGetQuote}
                    confirmSwap={handleConfirmSwap}
                  />
                </div>
              ) : (
                <div className="p-0">
                  <MemoComposer
                    profile={initialProfile}
                    forceShowQR={forceShowQR}
                    asset={originSymbol}
                    assetOptions={memoAssetOptions}
                    onSetAsset={handleSetAsset}
                    memo={memoForm.memo}
                    setMemo={(m) => setMemoForm(prev => ({ ...prev, memo: m }))}
                    amount={memoForm.amount}
                    setAmount={(a) => setMemoForm(prev => ({ ...prev, amount: a }))}
                    prefillFiatTicker={initialPrefill?.fiatTicker ?? ""}
                    prefillFiatAmount={initialPrefill?.fiatAmount ?? ""}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div ref={pageBottomSentinelRef} aria-hidden />
      </div>
    </div>
  );
}
