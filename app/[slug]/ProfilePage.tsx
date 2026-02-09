"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";

// Stores
import { useEditsStore } from "@/lib/stores/edits";
import { useMessagingStore } from "@/lib/stores/messaging";
import { useSwapStore } from "@/lib/stores/swap";

// Zcash utilities
import { buildZcashUri } from "@/lib/zcash/zcashUtils";

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
  const [quoteTransition, startQuoteTransition] = useTransition();
  const [confirmTransition, startConfirmTransition] = useTransition();

  const { pendingEdits } = useEditsStore();
  const { mode, draft, setDraft } = useMessagingStore();
  const swap = useSwapStore();

  // Fetch tokens on mount
  useEffect(() => {
    setIsLoadingTokens(true);
    getSwapTokens()
      .then((result) => {
        if ("tokens" in result) setTokens(result.tokens);
      })
      .finally(() => setIsLoadingTokens(false));
  }, []);

  // Token selection and swap mode detection
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const selectedToken = tokens.find((t) => getTokenId(t) === swap.originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";
  const isSwapMode = swap.originTokenId !== null && zecTokenId !== null && swap.originTokenId !== zecTokenId;

  // URI builders
  const memoUri = useMemo(() =>
    buildZcashUri(initialProfile.address, draft.amount || "0", draft.memo || ""),
    [initialProfile.address, draft.amount, draft.memo]
  );

  const openWallet = useCallback(() => {
    if (memoUri) window.open(memoUri, "_blank");
  }, [memoUri]);

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
    let result = null;
    startQuoteTransition(() => {
      getSwapQuote({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
        tokens,
      }).then((r) => { result = r; });
    });
    return result;
  }, [swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId, tokens]);

  const handleConfirmSwap = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    let result = null;
    startConfirmTransition(() => {
      confirmSwap({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
        tokens,
      }).then((r) => { result = r; });
    });
    return result;
  }, [swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId, tokens]);

  const handleSwapFieldChange = useCallback((field: 'amount' | 'refund' | 'slippage') => (value: string) => {
    if (field === 'amount') swap.setSwapAmount(value);
    else if (field === 'refund') swap.setRefundAddress(value);
    else swap.setSlippageTolerance(value);
    swap.resetQuote();
  }, [swap]);

  const handleSetDraftMemo = useCallback((memo: string) => {
    setDraft((prev) => ({ ...prev, memo }));
  }, [setDraft]);

  const handleSetDraftAmount = useCallback((amount: string) => {
    setDraft((prev) => ({ ...prev, amount }));
  }, [setDraft]);

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
              ) : (
                <div className="p-0 mt-4">
                  {isSwapMode ? (
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
                      isGettingQuote={quoteTransition}
                      isConfirming={confirmTransition}
                      quoteStatus={swap.quoteStatus}
                      swapError={swap.swapError}
                      isSwapMode={isSwapMode}
                      setToken={handleSetAsset}
                      setSwapAmount={handleSwapFieldChange('amount')}
                      setRefundAddress={handleSwapFieldChange('refund')}
                      setSlippageTolerance={handleSwapFieldChange('slippage')}
                      getQuote={handleGetQuote}
                      confirmSwap={handleConfirmSwap}
                      resetSwapState={handleResetSwapState}
                    />
                  ) : (
                    <MemoComposer
                      profile={initialProfile}
                      forceShowQR={false}
                      uri={memoUri}
                      memo={draft.memo ?? ""}
                      amount={draft.amount ?? ""}
                      openWallet={openWallet}
                      setDraftMemo={handleSetDraftMemo}
                      setDraftAmount={handleSetDraftAmount}
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
