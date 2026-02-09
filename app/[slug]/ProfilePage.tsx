"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import type { Profile } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";

// Stores
import { useSelectionStore } from "@/lib/stores/selection";
import { useEditsStore } from "@/lib/stores/edits";
import { useMessagingStore } from "@/lib/stores/messaging";
import { useSwapStore } from "@/lib/stores/swap";

// Zcash utilities
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";
import { getTokenId } from "@/lib/swap/swapPayload";

// Server actions
import { getSwapTokens } from "@/lib/swap/fetchTokens";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";

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
  // State
  const [profile] = useState<Profile>(initialProfile);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [quoteTransition, startQuoteTransition] = useTransition();
  const [confirmTransition, startConfirmTransition] = useTransition();

  // Stores
  const { forceShowQR, setForceShowQR } = useSelectionStore();
  const { pendingEdits, setPendingEdits } = useEditsStore();
  const { mode, draft, setDraft, verify, setVerify } = useMessagingStore();
  const swap = useSwapStore();

  // Fetch tokens on mount
  useEffect(() => {
    setIsLoadingTokens(true);
    getSwapTokens()
      .then((result) => {
        if (result.ok) {
          setTokens(result.data);
        }
      })
      .finally(() => setIsLoadingTokens(false));
  }, []);

  // Update verification memo when pending edits change
  useEffect(() => {
    if (mode !== "verification") return;
    const zId = verify.zId ?? null;
    if (!zId) return;

    const profileEdits = pendingEdits.profile ?? {};
    const linkTokens = pendingEdits.l ?? [];
    const hasEdits = Object.keys(profileEdits).length > 0 || linkTokens.length > 0;

    const profileDiff = hasEdits ? { ...profileEdits, l: linkTokens } : {};
    const nextMemo = buildZcashEditMemo(profileDiff, String(zId), verify.requestId ?? null);

    if (nextMemo !== verify.memo) {
      setVerify((prev) => ({ ...prev, memo: nextMemo }));
    }
  }, [mode, verify.zId, verify.requestId, verify.memo, pendingEdits, setVerify]);

  // Build URIs
  const memoUri = useMemo(() => {
    return buildZcashUri(profile.address, draft.amount || "0", draft.memo || "");
  }, [profile.address, draft.amount, draft.memo]);

  const openWallet = useCallback(() => {
    if (memoUri) window.open(memoUri, "_blank");
  }, [memoUri]);

  // Token selection
  const selectedToken = tokens.find((t) => getTokenId(t) === swap.originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";
  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;
  const isSwapMode = swap.originTokenId !== null &&
                     zecTokenId !== null &&
                     swap.originTokenId !== zecTokenId;

  // Handlers
  const handleSetAsset = useCallback((tokenId: string) => {
    swap.setOriginTokenId(tokenId);
    swap.setQuoteData(null);
    swap.setQuotePreview(null);
    swap.setQuoteStatus("");
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
      }).then((r) => { result = r; });
    });
    return result;
  }, [swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId]);

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
      confirmSwapAction({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
      }).then((r) => { result = r; });
    });
    return result;
  }, [swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId]);

  // Props bundles
  const feedbackProps = {
    setForceShowQR,
    pendingEdits,
    setPendingEdits,
  };

  const memoComposerProps = {
    profile,
    forceShowQR,
    uri: memoUri,
    memo: draft.memo ?? "",
    amount: draft.amount ?? "",
    openWallet,
    setDraftMemo: useCallback((memo: string) => {
      setDraft((prev) => ({ ...prev, memo }));
    }, [setDraft]),
    setDraftAmount: useCallback((amount: string) => {
      setDraft((prev) => ({ ...prev, amount }));
    }, [setDraft]),
    asset: originSymbol,
    assetOptions: tokens.map((token) => ({
      id: getTokenId(token) ?? "",
      symbol: token.symbol,
      label: `${token.symbol} - ${token.blockchain}`,
      logo: token.logo,
      chain: token.blockchain,
      decimals: token.decimals,
    })),
    onSetAsset: handleSetAsset,
  };

  const swapComposerProps = {
    profile,
    tokenOptions: tokens,
    originTokenId: swap.originTokenId,
    originSymbol,
    zecTokenId,
    swapAmount: swap.swapAmount,
    refundAddress: swap.refundAddress,
    slippageTolerance: swap.slippageTolerance,
    quotePreview: swap.quotePreview,
    quoteData: swap.quoteData,
    depositUri: swap.depositUri,
    statusKey: swap.statusKey,
    swapStatus: swap.swapStatus,
    isGettingQuote: quoteTransition,
    isConfirming: confirmTransition,
    quoteStatus: swap.quoteStatus,
    swapError: swap.swapError,
    isSwapMode,
    setToken: handleSetAsset,
    setSwapAmount: useCallback((amount: string) => {
      swap.setSwapAmount(amount);
      swap.setQuoteData(null);
      swap.setQuotePreview(null);
      swap.setQuoteStatus("");
    }, [swap]),
    setRefundAddress: useCallback((address: string) => {
      swap.setRefundAddress(address);
      swap.setQuoteData(null);
      swap.setQuotePreview(null);
      swap.setQuoteStatus("");
    }, [swap]),
    setSlippageTolerance: useCallback((slippage: string) => {
      swap.setSlippageTolerance(slippage);
      swap.setQuoteData(null);
      swap.setQuotePreview(null);
      swap.setQuoteStatus("");
    }, [swap]),
    getQuote: handleGetQuote,
    confirmSwap: handleConfirmSwap,
    resetSwapState: () => swap.resetSwapState(zecTokenId),
  };

  const verificationProps = {
    pendingEdits,
    verify,
    setVerifyRequestId: useCallback((requestId: string | null) => {
      setVerify((prev) => ({ ...prev, requestId }));
    }, [setVerify]),
    setVerifyAmount: useCallback((amount: string) => {
      setVerify((prev) => ({ ...prev, amount }));
    }, [setVerify]),
    setVerifyMemo: useCallback((memo: string) => {
      setVerify((prev) => ({ ...prev, memo }));
    }, [setVerify]),
  };

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
          key={profile.address}
          profile={profile}
          fullView
          duplicateNameCount={duplicateNameCount}
          feedbackProps={feedbackProps}
        />

        <div id="zcash-feedback" className="border-t mt-10 pt-6">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-xl mt-[-9px]">
              {mode === "verification" ? (
                <div className="p-0 mt-4">
                  <div
                    className="w-full border rounded-xl px-4 py-3 text-center border-[#000000]/90 mb-4"
                    style={{ lineHeight: "1.2" }}
                  >
                    <div className="font-semibold text-[15px] text-gray-800">
                      Create Verification Message & Request OTP
                    </div>
                    <div className="text-[13px] text-gray-600 mt-1 font-light">
                      customize message and verify address to apply edits
                    </div>
                  </div>
                  <ProfileVerification profile={profile} {...verificationProps} />
                </div>
              ) : (
                <div className="p-0 mt-4">
                  {isSwapMode ? (
                    <SwapComposer {...swapComposerProps} />
                  ) : (
                    <MemoComposer {...memoComposerProps} />
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
