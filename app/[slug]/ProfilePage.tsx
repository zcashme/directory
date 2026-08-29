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
import { resolveProfileVisualTheme } from "@/lib/profile/profileCardTheme";
import { useJoinModal } from "@/ui/signup/JoinModalContext";
import { buildSlug } from "@/lib/profile/profileUtils";

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
    () => resolveProfileVisualTheme({
      isMaxi,
      profileThemePackage: initialProfile.profile_theme_package,
      profileCardTheme: initialProfile.profile_card_theme,
      profilePageBackground: initialProfile.profile_page_bkgd,
      profileCardBorder: initialProfile.profile_card_border,
    }).pageBackground,
    [
      isMaxi,
      initialProfile.profile_theme_package,
      initialProfile.profile_card_theme,
      initialProfile.profile_page_bkgd,
      initialProfile.profile_card_border,
    ]
  );
  const hasAutoScrolledPrefillRef = useRef(false);
  const pageBottomSentinelRef = useRef<HTMLDivElement | null>(null);
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
    slippageTolerance: '2',
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

  const { justCreatedSlug, clearJustCreated } = useJoinModal();
  const [showVerificationBanner, setShowVerificationBanner] = useState(
    () => justCreatedSlug === buildSlug(initialProfile) && !initialProfile.address_verified
  );
  useEffect(() => {
    if (showVerificationBanner) clearJustCreated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [designPanelBackgroundPreview, setDesignPanelBackgroundPreview] = useState<string | null>(null);
  const [verificationGenerateQrTrigger, setVerificationGenerateQrTrigger] = useState(0);
  const [isVerificationGenerating, setIsVerificationGenerating] = useState(false);
  const [pendingVerificationScroll, setPendingVerificationScroll] = useState(false);

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

  const runMultiPassScroll = useCallback((scrollFn: () => void) => {
    scrollFn();
    window.requestAnimationFrame(scrollFn);
    window.setTimeout(scrollFn, 120);
    window.setTimeout(scrollFn, 280);
  }, []);

  // Handlers
  const handleGenerateVerificationQr = useCallback(() => {
    setPendingVerificationScroll(true);
    setVerificationGenerateQrTrigger((prev) => prev + 1);
  }, []);

  const handleVerificationQrReady = useCallback(() => {
    if (!pendingVerificationScroll) return;
    runMultiPassScroll(() => {
      const el = document.getElementById("zcash-feedback");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setPendingVerificationScroll(false);
  }, [pendingVerificationScroll, runMultiPassScroll]);

  const handleVerificationLoadingStateChange = useCallback((isLoading: boolean) => {
    setIsVerificationGenerating(isLoading);
  }, []);

  useEffect(() => {
    if (mode !== "verification") {
      setIsVerificationGenerating(false);
      setPendingVerificationScroll(false);
    }
  }, [mode]);

  const handleShowQR = useCallback(() => {
    setForceShowQR(true);
    setTimeout(() => {
      runMultiPassScroll(() => {
        const el = document.getElementById("zcash-feedback");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }, 200);
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
        {showVerificationBanner && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            <span className="flex-1">Your Zcash address isn&apos;t verified yet.</span>
            <button
              onClick={() => {
                setShowVerificationBanner(false);
                setIsProfileEditing(true);
                handleGenerateVerificationQr();
              }}
              className="font-semibold underline underline-offset-2 hover:text-blue-700 whitespace-nowrap"
            >
              Verify now
            </button>
            <button
              onClick={() => setShowVerificationBanner(false)}
              aria-label="Dismiss"
              className="ml-1 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <ProfileCard
          profile={initialProfile}
          tokens={tokens}
          fullView
          duplicateNameCount={duplicateNameCount}
          onShowQR={handleShowQR}
          onEditorModeChange={setIsProfileEditing}
          onDesignPanelBackgroundChange={setDesignPanelBackgroundPreview}
          onGenerateVerificationQr={handleGenerateVerificationQr}
          isVerificationGenerating={isVerificationGenerating}
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
                  onLoadingStateChange={handleVerificationLoadingStateChange}
                  onQrReady={handleVerificationQrReady}
                />
              ) : mode === "swap" ? (
                <div className="p-0">
                  <SwapComposer
                    profile={initialProfile}
                    tokenOptions={tokens}
                    selectedAsset={originTokenId ?? originSymbol}
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
