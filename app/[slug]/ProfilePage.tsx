"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";

// Stores
import { useEditsStore } from "@/lib/stores/edits";
import { useMessagingStore } from "@/lib/stores/messaging";
import { useSwapStore } from "@/lib/stores/swap";

// Swap utilities
import { getTokenId } from "@/lib/swap/utils";

// Server actions
import { getSwapTokens, getSwapQuote, confirmSwap } from "@/lib/swap/oneclick";

// UI Components
import ProfileCard from "@/ui/profile/ProfileCard";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import MemoComposer from "@/ui/messaging/MemoComposer";
import ProfileVerification from "@/ui/verification/ProfileVerification";
import SwapComposer from "@/ui/swap/SwapComposer";

interface ProfilePageProps {
  initialProfile: Profile;
  profileCount?: number;
  duplicateNameCount?: number;
}

export default function ProfilePage({
  initialProfile,
  profileCount,
  duplicateNameCount
}: ProfilePageProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const { pendingEdits } = useEditsStore();
  const { mode, showBack, setMode, setShowBack } = useMessagingStore();
  const swap = useSwapStore();
  const prevProfileRef = useRef(initialProfile.address);

  // Fetch tokens on mount
  useEffect(() => {
    setIsLoadingTokens(true);
    getSwapTokens()
      .then((result) => {
        if ("tokens" in result) setTokens(result.tokens);
      })
      .finally(() => setIsLoadingTokens(false));
  }, []);

  // Token selection
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const selectedToken = tokens.find((t) => getTokenId(t) === swap.originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";

  // Mode selection logic based on card flip state and token selection
  useEffect(() => {
    // Reset UI state only when switching to a different profile
    if (prevProfileRef.current !== initialProfile.address) {
      setShowBack(false);
      swap.resetSwapState(zecTokenId);
      prevProfileRef.current = initialProfile.address;
    }

    if (showBack) {
      // Card is flipped to back (edit profile) -> verification mode
      setMode("verification");
    } else {
      // Card is on front -> determine mode based on token selection
      const isNonZecToken = swap.originTokenId !== null &&
                            zecTokenId !== null &&
                            swap.originTokenId !== zecTokenId;

      if (isNonZecToken) {
        setMode("swap");
      } else {
        setMode("memo");
      }
    }
  }, [showBack, swap.originTokenId, zecTokenId, setMode, initialProfile.address]);

  // Handlers
  const handleSetAsset = useCallback((tokenId: string) => {
    swap.setOriginTokenId(tokenId);
    swap.resetQuote();
    swap.setSwapError("");
  }, [swap]);

  const handleGetQuote = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    setIsGettingQuote(true);
    swap.setQuoteStatus("Getting quote...");
    swap.setSwapError("");

    try {
      const result = await getSwapQuote({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
        tokens,
      });

      if (result.ok) {
        swap.setQuoteData(result);
        swap.setQuotePreview(result.display);
        swap.setQuoteStatus("");
      } else {
        swap.setSwapError(result.error);
        swap.setQuoteStatus("");
      }

      return result;
    } finally {
      setIsGettingQuote(false);
    }
  }, [swap, zecTokenId, tokens]);

  const handleConfirmSwap = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    setIsConfirming(true);
    swap.setSwapStatus("Confirming swap...");
    swap.setSwapError("");

    try {
      const result = await confirmSwap({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
        tokens,
      });

      if (result.ok) {
        swap.setQuoteData(result);
        swap.setDepositUri(result.paymentUri);
        swap.setStatusKey(result.statusKey);
        swap.setSwapStatus("Waiting for deposit...");
      } else {
        swap.setSwapError(result.error);
        swap.setSwapStatus("");
      }

      return result;
    } finally {
      setIsConfirming(false);
    }
  }, [swap, zecTokenId, tokens]);

  const handleSwapFieldChange = useCallback((field: 'amount' | 'refund' | 'slippage') => (value: string) => {
    if (field === 'amount') swap.setSwapAmount(value);
    else if (field === 'refund') swap.setRefundAddress(value);
    else swap.setSlippageTolerance(value);
    swap.resetQuote();
  }, [swap]);

  const handleResetSwapState = useCallback(() => {
    swap.resetSwapState(zecTokenId);
  }, [swap, zecTokenId]);

  if (isLoadingTokens) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ProfileHeader profileCount={profileCount} />
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
                    swapAmount={swap.swapAmount}
                    refundAddress={swap.refundAddress}
                    slippageTolerance={swap.slippageTolerance}
                    quotePreview={swap.quotePreview}
                    quoteData={swap.quoteData}
                    depositUri={swap.depositUri}
                    statusKey={swap.statusKey}
                    swapStatus={swap.swapStatus}
                    isGettingQuote={isGettingQuote}
                    isConfirming={isConfirming}
                    quoteStatus={swap.quoteStatus}
                    swapError={swap.swapError}
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
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
