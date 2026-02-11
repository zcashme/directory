"use client";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token, SwapContextQuoteData, SwapQuoteDisplay } from "@/lib/swap/types";

// Stores
import { useEditsStore } from "@/lib/stores/edits";
import { useMessagingStore, useSwapStore, ProfileStoresProvider } from "@/lib/contexts/ProfileStoresContext";

// Swap utilities
import { getTokenId } from "@/lib/swap/utils";

// Profile utilities
import { getModeFromState } from "@/lib/profile/getModeFromState";

// Server actions
import { getSwapQuote, confirmSwap } from "@/lib/swap/oneClick";

// UI Components
import ProfileCard from "@/ui/profile/ProfileCard";
import MemoComposer from "@/ui/messaging/MemoComposer";
import ProfileVerification from "@/ui/verification/ProfileVerification";
import SwapComposer from "@/ui/swap/SwapComposer";

interface ProfilePageProps {
  initialProfile: Profile;
  tokens: Token[];
  duplicateNameCount?: number;
}

export default function ProfilePage({
  initialProfile,
  tokens,
  duplicateNameCount
}: ProfilePageProps) {
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Local swap form state (previously in global store)
  const [swapForm, setSwapForm] = useState({
    amount: '',
    refundAddress: '',
    slippageTolerance: '1',
  });

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
  const [memoForm, setMemoForm] = useState({
    memo: '',
    amount: '',
  });

  // Granular subscriptions to prevent unnecessary re-renders
  const pendingEdits = useEditsStore(state => state.pendingEdits);

  // Messaging store selectors
  const mode = useMessagingStore(state => state.mode);
  const showBack = useMessagingStore(state => state.showBack);
  const setMode = useMessagingStore(state => state.setMode);
  const ensureMessagingProfile = useMessagingStore(state => state.ensureProfile);

  // Swap store selectors (only for originTokenId now)
  const originTokenId = useSwapStore(state => state.originTokenId);
  const setOriginTokenId = useSwapStore(state => state.setOriginTokenId);
  const ensureSwapProfile = useSwapStore(state => state.ensureProfile);

  // Extract local state values
  const swapAmount = swapForm.amount;
  const refundAddress = swapForm.refundAddress;
  const slippageTolerance = swapForm.slippageTolerance;
  const { quoteData, quotePreview, depositUri, statusKey, quoteStatus, swapError } = quoteState;

  // Reset stores when switching to a different profile (synchronous, before paint)
  useLayoutEffect(() => {
    ensureMessagingProfile(initialProfile.address);
    ensureSwapProfile(initialProfile.address, null);
  }, [initialProfile.address, ensureMessagingProfile, ensureSwapProfile]);

  // Token selection
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const selectedToken = tokens.find((t) => getTokenId(t) === originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";

  // Mode selection logic based on card flip state and token selection
  useEffect(() => {
    const newMode = getModeFromState(showBack, originTokenId, zecTokenId);
    setMode(newMode);
  }, [showBack, originTokenId, zecTokenId, setMode]);

  // Handlers
  const handleSetAsset = useCallback((tokenId: string) => {
    setOriginTokenId(tokenId);
    setQuoteState(prev => ({
      ...prev,
      quoteData: null,
      quotePreview: null,
      quoteStatus: '',
      swapError: '',
    }));
  }, [setOriginTokenId]);

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
          quotePreview: result.display,
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
          depositUri: result.paymentUri,
          statusKey: result.statusKey,
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
      quoteStatus: '',
    }));
  }, []);

  const handleResetSwapState = useCallback(() => {
    setSwapForm({
      amount: '',
      refundAddress: '',
      slippageTolerance: '1',
    });
    setQuoteState({
      quoteData: null,
      quotePreview: null,
      depositUri: '',
      statusKey: null,
      quoteStatus: '',
      swapError: '',
    });
    setOriginTokenId(zecTokenId);
  }, [zecTokenId, setOriginTokenId]);

  return (
    <ProfileStoresProvider profileAddress={initialProfile.address}>
      <div
        className="relative max-w-3xl mx-auto p-4 pb-24 pt-12 -mt-6 min-h-screen"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <ProfileCard
          profile={initialProfile}
          fullView
          duplicateNameCount={duplicateNameCount}
        />

        <div id="zcash-feedback" className="border-t mt-10 pt-6">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-xl mt-[-9px]">
              {mode === "verification" ? (
                <ProfileVerification
                  profile={initialProfile}
                  pendingEdits={pendingEdits}
                />
              ) : mode === "swap" ? (
                <div className="p-0 mt-4">
                  <SwapComposer
                    profile={initialProfile}
                    tokenOptions={tokens}
                    originSymbol={originSymbol}
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
                    setToken={handleSetAsset}
                    setSwapAmount={handleSwapFieldChange('amount')}
                    setRefundAddress={handleSwapFieldChange('refund')}
                    setSlippageTolerance={handleSwapFieldChange('slippage')}
                    getQuote={handleGetQuote}
                    confirmSwap={handleConfirmSwap}
                    resetSwapState={handleResetSwapState}
                  />
                </div>
              ) : (
                <div className="p-0 mt-4">
                  <MemoComposer
                    profile={initialProfile}
                    forceShowQR={false}
                    asset={originSymbol}
                    assetOptions={tokens.map((token) => ({
                      id: getTokenId(token) ?? "",
                      symbol: token.symbol,
                      label: `${token.symbol} - ${token.blockchain}`,
                      logo: token.logo,
                      chain: token.blockchain,
                      decimals: token.decimals,
                    }))}
                    onSetAsset={handleSetAsset}
                    memo={memoForm.memo}
                    setMemo={(m) => setMemoForm(prev => ({ ...prev, memo: m }))}
                    amount={memoForm.amount}
                    setAmount={(a) => setMemoForm(prev => ({ ...prev, amount: a }))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProfileStoresProvider>
  );
}
