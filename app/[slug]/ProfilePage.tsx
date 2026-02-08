"use client";

// React & Next.js
import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { Profile, Token } from "@/types/index";

// Contexts - using typed hooks
import { useSelection } from "@/app/[slug]/providers/selection-provider";
import { useEdits } from "@/app/[slug]/providers/edits-provider";
import { useMessaging } from "@/app/[slug]/providers/messaging-provider";
import { useSwap } from "@/app/[slug]/providers/swap-provider";

// Zcash utilities
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";

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

  // Contexts - using typed hooks
  const { forceShowQR, setForceShowQR } = useSelection();
  const { pendingEdits, setPendingEdits } = useEdits();
  const {
    mode, setMode,
    draft, verify,
    setDraftMemo, setDraftAmount,
    setVerifyMemo, setVerifyAmount,
    setVerifyId, setVerifyRequestId,
  } = useMessaging();
  const swapContext = useSwap();

  // Feedback events effect
  useEffect(() => {
    let listenerBound = false;
    if (listenerBound) return;
    listenerBound = true;

    const handleSignIn = (e: CustomEvent) => {
      const { zId } = e.detail || {};
      if (zId) {
        setVerifyId(zId);
        setVerifyMemo(`{z:${zId}}`);
      }
      setVerifyRequestId(null);
      setVerifyAmount("0");
      setMode("signin");
    };

    const handleDraft = () => setMode("note");

    const handlePendingEdits = (e: CustomEvent) => {
      if (!e.detail) return;
      setPendingEdits(e.detail.field, e.detail.value);
    };

    window.addEventListener("enterSignInMode", handleSignIn as EventListener);
    window.addEventListener("enterDraftMode", handleDraft as EventListener);
    window.addEventListener("pendingEditsUpdated", handlePendingEdits as EventListener);

    return () => {
      window.removeEventListener("enterSignInMode", handleSignIn as EventListener);
      window.removeEventListener("enterDraftMode", handleDraft as EventListener);
      window.removeEventListener("pendingEditsUpdated", handlePendingEdits as EventListener);
    };
  }, [setMode, setPendingEdits, setVerifyId, setVerifyMemo, setVerifyAmount, setVerifyRequestId]);

  // Memo controller logic
  const address = profile?.address;

  // Update verify memo when in signin mode with pending edits
  useEffect(() => {
    if (mode !== "signin") return;
    const zId = verify.zId || null;
    if (!zId) return;
    const requestId = verify.requestId || null;

    const hasEdits = pendingEdits && (
      ((pendingEdits as any).profile && Object.keys((pendingEdits as any).profile).length > 0) ||
      (Array.isArray((pendingEdits as any).l) && (pendingEdits as any).l.length > 0)
    );

    const profileDiff = {
      ...((pendingEdits as any)?.profile || {}),
      l: (pendingEdits as any)?.l || [],
    };

    const nextMemo = buildZcashEditMemo(hasEdits ? profileDiff : {}, zId, requestId);
    if (nextMemo !== verify.memo) {
      setVerifyMemo(nextMemo);
    }
  }, [mode, verify.zId, verify.requestId, pendingEdits, verify.memo, setVerifyMemo]);

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

  // Effects - Document Metadata (Title & Favicon)
  useEffect(() => {
    if (!profile) return;

    const originalTitle = document.title;
    const originalFavicon = document.querySelector("link[rel='icon']")?.getAttribute("href") || "/favicon.ico";

    const displayName = profile.display_name || profile.name || "Profile";
    document.title = `${displayName} | Zcash.me`;

    if (profile.profile_image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, size, size);

          let faviconLink: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
          if (!faviconLink) {
            faviconLink = document.createElement("link");
            faviconLink.rel = "icon";
            document.head.appendChild(faviconLink);
          }
          faviconLink.href = canvas.toDataURL("image/png");
        }
      };
      img.src = profile.profile_image_url;
    }

    return () => {
      document.title = originalTitle;
      const faviconLink = document.querySelector("link[rel='icon']");
      if (faviconLink) {
        faviconLink.setAttribute("href", originalFavicon);
      }
    };
  }, [profile]);

  // Early Returns
  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  // Props bundles for UI components
  const feedbackProps = {
    forceShowQR,
    setForceShowQR,
    pendingEdits,
    setPendingEdits,
    mode,
    setMode,
    verify,
    setVerifyId,
    setVerifyRequestId,
    setVerifyMemo,
    setVerifyAmount,
  };

  const memoComposerProps = {
    forceShowQR,
    uri,
    memo: draft.memo || "",
    amount: draft.amount || "",
    openWallet,
    setDraftMemo,
    setDraftAmount,
    asset: swapContext.originSymbol || "ZEC",
    assetOptions: (swapContext.tokenOptions || []).map((token: Token) => ({
      id: token.id || token.assetId || token.tokenId || token.asset,
      symbol: token.symbol || token.ticker || "",
      label: `${token.symbol || token.ticker || ""} - ${token.blockchain || ""}`,
      logo: token.logo || null,
      chain: token.blockchain || "",
      decimals: token.decimals || 8,
    })),
    onSetAsset: swapContext.setToken,
  };

  const swapComposerProps = {
    // Token state
    tokenOptions: swapContext.tokenOptions || [],
    originTokenId: swapContext.originTokenId,
    originSymbol: swapContext.originSymbol,
    zecTokenId: swapContext.zecTokenId,
    // Swap input state
    swapAmount: swapContext.swapAmount,
    refundAddress: swapContext.refundAddress,
    slippageTolerance: swapContext.slippageTolerance,
    // Quote output state
    quotePreview: swapContext.quotePreview,
    quoteData: swapContext.quoteData,
    // Swap output state
    depositUri: swapContext.depositUri,
    statusKey: swapContext.statusKey,
    swapStatus: swapContext.swapStatus,
    // UI state
    isGettingQuote: swapContext.isGettingQuote,
    isConfirming: swapContext.isConfirming,
    quoteStatus: swapContext.quoteStatus,
    swapError: swapContext.swapError,
    // Computed
    isSwapMode: swapContext.isSwapMode,
    // Actions
    setToken: swapContext.setToken,
    setSwapAmount: swapContext.setSwapAmount,
    setRefundAddress: swapContext.setRefundAddress,
    setSlippageTolerance: swapContext.setSlippageTolerance,
    getQuote: swapContext.getQuote,
    confirmSwap: swapContext.confirmSwap,
    resetSwapState: swapContext.resetSwapState,
  };

  const verificationProps = {
    pendingEdits,
    verify,
    setVerifyRequestId,
    setVerifyAmount,
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
          feedbackProps={feedbackProps as any}
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
                        Request One-Time Passcode (OTP)
                      </div>

                      <div className="text-[13px] text-gray-600 mt-1 font-light">
                        to verify address and apply edits
                      </div>
                    </div>
                  }
                >
                  <ProfileVerification profile={profile} {...verificationProps} />
                </ZcashCardWrapper>
              ) : (
                <ZcashCardWrapper>
                  {swapContext.isSwapMode ? (
                    <SwapComposer profile={profile} {...swapComposerProps as any} />
                  ) : (
                    <MemoComposer profile={profile} {...memoComposerProps as any} />
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
