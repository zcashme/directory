"use client";

import { useEffect, useState, useCallback } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token, SwapContextQuoteData, SwapQuoteDisplay } from "@/lib/swap/types";

// Stores
import { useEditsStore } from "@/lib/stores/edits";

// Swap utilities
import { getTokenId } from "@/lib/swap/utils";

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

  // Force show QR state
  const [forceShowQR, setForceShowQR] = useState(false);

  // Granular subscriptions to prevent unnecessary re-renders
  const pendingEdits = useEditsStore(state => state.pendingEdits);

  // Local state
  const [mode, setMode] = useState<'donate' | 'swap' | 'verification'>('donate');
  const [originTokenId, setOriginTokenId] = useState<string | null>(null);

  // Extract local state values
  const swapAmount = swapForm.amount;
  const refundAddress = swapForm.refundAddress;
  const slippageTolerance = swapForm.slippageTolerance;
  const { quoteData, quotePreview, depositUri, statusKey, quoteStatus, swapError } = quoteState;

  // Token selection
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const selectedToken = tokens.find((t) => getTokenId(t) === originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";

  // Mode selection logic based on token selection
  useEffect(() => {
    // Determine if user selected a non-ZEC token for swapping
    const isNonZecToken =
      originTokenId !== null &&
      zecTokenId !== null &&
      originTokenId !== zecTokenId;

    setMode(isNonZecToken ? 'swap' : 'donate');
  }, [originTokenId, zecTokenId]);

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

  const handleShowQR = useCallback(() => {
    setForceShowQR(true);
    setTimeout(() => {
      const el = document.getElementById("zcash-feedback");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, []);

  return (
    <div
      className="relative max-w-3xl mx-auto p-4 pb-24 pt-12 -mt-6 min-h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
        <ProfileCard
          profile={initialProfile}
          fullView
          duplicateNameCount={duplicateNameCount}
          onShowQR={handleShowQR}
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
                    forceShowQR={forceShowQR}
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
  );
}
