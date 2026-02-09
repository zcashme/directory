"use client";

// React & Next.js
import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { Profile, PendingEditsField, PendingEditValue } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";
import type { FeedbackProps } from "@/ui/profile/feedback-types";

// Stores
import { useSelectionStore } from "@/lib/stores/selection";
import { useEditsStore } from "@/lib/stores/edits";
import { useMessagingStore } from "@/lib/stores/messaging";
import { useSwapStore } from "@/lib/stores/swap";

// Zcash utilities
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";
import { getTokenId } from "@/lib/swap/swapPayload";

// UI Components - Profile
import ProfileCard from "@/ui/profile/ProfileCard";
import ProfileHeader from "@/ui/profile/ProfileHeader";

// UI Components - Messaging
import MemoComposer from "@/ui/messaging/MemoComposer";

// UI Components - Verification
import ProfileVerification from "@/ui/verification/ProfileVerification";

// UI Components - Swap
import SwapComposer from "@/ui/swap/SwapComposer";

// Helper Components
interface ZcashCardWrapperProps {
  title?: ReactNode;
  children: ReactNode;
}

type PendingEditsEvent = CustomEvent<{
  field: PendingEditsField;
  value: PendingEditValue;
}>;

function ZcashCardWrapper({ title, children }: ZcashCardWrapperProps) {
  return (
    <div className="p-0 mt-4 bg-transparent shadow-none border-none rounded-none">
      {title && <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>}
      {children}
    </div>
  );
}

interface ProfilePageProps {
  initialProfile: Profile;
  profileCount?: number;
  duplicateNameCount?: number;
}

// Main Component
export default function ProfilePage({ initialProfile, profileCount, duplicateNameCount }: ProfilePageProps) {
  // State
  const [profile] = useState<Profile>(initialProfile);
  const [loading] = useState<boolean>(false);

  // Stores
  const { forceShowQR, setForceShowQR } = useSelectionStore();
  const { pendingEdits, setPendingEdits } = useEditsStore();
  const {
    mode, setMode,
    draft, setDraft,
    verify, setVerify,
  } = useMessagingStore();
  const swap = useSwapStore();

  // Feedback events effect
  useEffect(() => {
    const handleSignIn = (event: Event) => {
      const customEvent = event as CustomEvent<{ zId?: number }>;
      const { zId } = customEvent.detail ?? {};
      setVerify((prev) => ({
        ...prev,
        zId: zId ?? null,
        memo: zId ? `{z:${zId}}` : prev.memo,
        requestId: null,
        amount: "0",
      }));
      setMode("signin");
    };

    const handleDraft = () => setMode("note");

    const handlePendingEdits = (event: Event) => {
      const customEvent = event as PendingEditsEvent;
      const detail = customEvent.detail;
      if (!detail) return;
      setPendingEdits((prev) => ({ ...prev, [detail.field]: detail.value }));
    };

    window.addEventListener("enterSignInMode", handleSignIn);
    window.addEventListener("enterDraftMode", handleDraft);
    window.addEventListener("pendingEditsUpdated", handlePendingEdits);

    return () => {
      window.removeEventListener("enterSignInMode", handleSignIn);
      window.removeEventListener("enterDraftMode", handleDraft);
      window.removeEventListener("pendingEditsUpdated", handlePendingEdits);
    };
  }, [setMode, setPendingEdits, setVerify]);

  // Memo controller logic
  const address = profile?.address;

  // Update verify memo when in signin mode with pending edits
  useEffect(() => {
    if (mode !== "signin") return;
    const zId = verify.zId ?? null;
    if (!zId) return;
    const requestId = verify.requestId ?? null;

    const profileEdits = pendingEdits.profile ?? {};
    const linkTokens = pendingEdits.l ?? [];
    const hasProfileEdits = Object.keys(profileEdits).length > 0;
    const hasLinkTokens = linkTokens.length > 0;
    const hasEdits = hasProfileEdits || hasLinkTokens;

    const profileDiff = {
      ...profileEdits,
      l: linkTokens,
    };

    const nextMemo = buildZcashEditMemo(hasEdits ? profileDiff : {}, String(zId), requestId);
    if (nextMemo !== verify.memo) {
      setVerify((prev) => ({ ...prev, memo: nextMemo }));
    }
  }, [mode, verify.zId, verify.requestId, pendingEdits, verify.memo, setVerify]);

  // Computed URIs
  const uri = useMemo(() => {
    const memo = draft.memo || "";
    const amount = draft.amount || "0";
    return buildZcashUri(address, amount, memo);
  }, [address, draft]);


  const openWallet = useCallback(() => {
    if (!uri) return;
    window.open(uri, "_blank");
  }, [uri]);



  // Effects - Event Listeners
  useEffect(() => {
    const handler = () => {
      setMode("note");
      setForceShowQR(false);
    };
    window.addEventListener("forceFeedbackNoteMode", handler);
    return () => window.removeEventListener("forceFeedbackNoteMode", handler);
  }, [setMode, setForceShowQR]);

  // Early Returns
  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  // Props bundles for UI components
  const feedbackProps: FeedbackProps = {
    setForceShowQR,
    pendingEdits,
    setPendingEdits,
  };

  const setDraftMemo = useCallback((memo: string) => {
    setDraft((prev) => ({ ...prev, memo }));
  }, [setDraft]);

  const setDraftAmount = useCallback((amount: string) => {
    setDraft((prev) => ({ ...prev, amount }));
  }, [setDraft]);

  const handleSetAsset = useCallback((tokenId: string) => {
    swap.setOriginTokenId(tokenId);
    swap.setQuoteData(null);
    swap.setQuotePreview(null);
    swap.setQuoteStatus("");
    swap.setSwapError("");
  }, [swap]);

  const selectedToken = tokens.find((t) => getTokenId(t) === swap.originTokenId);
  const originSymbol = selectedToken?.symbol ?? "ZEC";

  const memoComposerProps = {
    profile,
    forceShowQR,
    uri,
    memo: draft.memo ?? "",
    amount: draft.amount ?? "",
    openWallet,
    setDraftMemo,
    setDraftAmount,
    asset: originSymbol,
    assetOptions: (tokens ?? []).map((token: Token) => ({
      id: getTokenId(token) ?? "",
      symbol: token.symbol,
      label: `${token.symbol} - ${token.blockchain}`,
      logo: token.logo,
      chain: token.blockchain,
      decimals: token.decimals,
    })),
    onSetAsset: handleSetAsset,
  };

  const handleSwapAmountChange = useCallback((amount: string) => {
    swap.setSwapAmount(amount);
    swap.setQuoteData(null);
    swap.setQuotePreview(null);
    swap.setQuoteStatus("");
  }, [swap]);

  const handleRefundAddressChange = useCallback((address: string) => {
    swap.setRefundAddress(address);
    swap.setQuoteData(null);
    swap.setQuotePreview(null);
    swap.setQuoteStatus("");
  }, [swap]);

  const handleSlippageToleranceChange = useCallback((slippage: string) => {
    swap.setSlippageTolerance(slippage);
    swap.setQuoteData(null);
    swap.setQuotePreview(null);
    swap.setQuoteStatus("");
  }, [swap]);

  const zecToken = tokens.find((t) =>
    t.symbol.toUpperCase() === "ZEC" && t.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? null;

  const handleGetQuote = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    try {
      const result = await getQuoteMutation.mutateAsync({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
      });
      return result;
    } catch {
      return null;
    }
  }, [getQuoteMutation, swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId]);

  const handleConfirmSwap = useCallback(async (params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => {
    try {
      const result = await confirmSwapMutation.mutateAsync({
        fromToken: params.fromToken ?? swap.originTokenId ?? "",
        toToken: params.toToken ?? zecTokenId ?? "",
        amountIn: params.amountIn,
        destAddress: params.destAddress,
        refundAddress: params.refund ?? swap.refundAddress,
        slippageTolerance: params.slippage ?? swap.slippageTolerance,
      });
      return result;
    } catch {
      return null;
    }
  }, [confirmSwapMutation, swap.originTokenId, swap.refundAddress, swap.slippageTolerance, zecTokenId]);

  const isSwapMode = swap.originTokenId !== null && zecTokenId !== null && swap.originTokenId !== zecTokenId;

  const swapComposerProps = {
    profile,
    tokenOptions: tokens ?? [],
    originTokenId: swap.originTokenId,
    originSymbol: originSymbol,
    zecTokenId: zecTokenId,
    swapAmount: swap.swapAmount,
    refundAddress: swap.refundAddress,
    slippageTolerance: swap.slippageTolerance,
    quotePreview: swap.quotePreview,
    quoteData: swap.quoteData,
    depositUri: swap.depositUri,
    statusKey: swap.statusKey,
    swapStatus: swap.swapStatus,
    isGettingQuote: false,
    isConfirming: false,
    quoteStatus: swap.quoteStatus,
    swapError: swap.swapError,
    isSwapMode: isSwapMode,
    setToken: handleSetAsset,
    setSwapAmount: handleSwapAmountChange,
    setRefundAddress: handleRefundAddressChange,
    setSlippageTolerance: handleSlippageToleranceChange,
    getQuote: handleGetQuote,
    confirmSwap: handleConfirmSwap,
    resetSwapState: () => { swap.resetSwapState(zecTokenId); },
  };

  const setVerifyRequestId = useCallback((requestId: string | null) => {
    setVerify((prev) => ({ ...prev, requestId }));
  }, [setVerify]);

  const setVerifyAmount = useCallback((amount: string) => {
    setVerify((prev) => ({ ...prev, amount }));
  }, [setVerify]);

  const setVerifyMemo = useCallback((memo: string) => {
    setVerify((prev) => ({ ...prev, memo }));
  }, [setVerify]);

  const verificationProps = {
    pendingEdits,
    verify,
    setVerifyRequestId,
    setVerifyAmount,
    setVerifyMemo,
  };

  return (
    <>
      <ProfileHeader profileCount={profileCount} />
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-12 -mt-6 min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <ProfileCard
          key={profile.address}
          profile={profile}
          fullView
          duplicateNameCount={duplicateNameCount}
          feedbackProps={feedbackProps}
        />

        <div id="zcash-feedback" className="border-t mt-10 pt-6 text-center">
          <div className="w-full flex justify-center bg-transparent border-none shadow-none">
            <div className="w-full max-w-xl mt-[-9px]">
              {mode === "signin" ? (
                <ZcashCardWrapper
                  title={
                    <div
                      className="
                        w-full
                        border
                        rounded-xl
                        px-4
                        py-3
                        bg-transparent
                        text-center
                        border-[#000000]/90
                      "
                      style={{ lineHeight: "1.2" }}
                    >
                      <div className="font-semibold text-[15px] text-gray-800 flex items-center justify-center gap-1">
                        Create Verification Message & Request OTP
                      </div>

                      <div className="text-[13px] text-gray-600 mt-1 font-light">
                        customize message and verify address to apply edits
                      </div>
                    </div>
                  }
                >
                  <ProfileVerification profile={profile} {...verificationProps} />
                </ZcashCardWrapper>
              ) : (
                <ZcashCardWrapper>
                {isSwapMode ? (
                    <SwapComposer {...swapComposerProps} />
                  ) : (
                    <MemoComposer {...memoComposerProps} />
                  )}
                </ZcashCardWrapper>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
