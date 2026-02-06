"use client";

// React & Next.js
import { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { notFound } from "next/navigation";

// Data fetching utilities
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount, getDuplicateNameCount } from "@/lib/profile/profileQueries";

// Contexts
import { SelectionContext } from "@/app/[slug]/providers/selection-provider";
import { EditsContext } from "@/app/[slug]/providers/edits-provider";
import { MessagingContext } from "@/app/[slug]/providers/messaging-provider";
import { SwapContext } from "@/app/[slug]/providers/swap-provider";

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
import { SwapSettings, SwapStatusDisplay, SwapRecipientInfo, SwapTokenSelector, SwapRefundAddress } from "@/ui/swap/SwapComposer";

// Helper Components
function ZcashCardWrapper({ title, children }) {
  return (
    <div className="p-0 mt-4 bg-transparent shadow-none border-none rounded-none">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Main Component
export default function ProfilePage({ params }) {
  // State
  const [profile, setProfile] = useState(null);
  const [profileCount, setProfileCount] = useState(0);
  const [duplicateNameCount, setDuplicateNameCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // Contexts - used directly instead of useFeedback hook
  const selectionCtx = useContext(SelectionContext) || {};
  const editsCtx = useContext(EditsContext) || {};
  const messagingCtx = useContext(MessagingContext) || {};
  const swapContext = useContext(SwapContext) || {};

  // Destructure context values
  const { forceShowQR, setForceShowQR } = selectionCtx;
  const { pendingEdits, setPendingEdits } = editsCtx;
  const {
    mode, setMode,
    draft, verify,
    setDraftMemo, setDraftAmount,
    setVerifyMemo, setVerifyAmount,
    setVerifyId, setVerifyRequestId,
  } = messagingCtx;

  // Feedback events effect (formerly useFeedbackEvents)
  useEffect(() => {
    let listenerBound = false;
    if (listenerBound) return;
    listenerBound = true;

    const handleSignIn = (e) => {
      const { zId } = e.detail || {};
      if (zId) {
        setVerifyId?.(zId);
        setVerifyMemo?.(`{z:${zId}}`);
      }
      setVerifyRequestId?.(null);
      setVerifyAmount?.("0");
      setMode?.("signin");
    };

    const handleDraft = () => setMode?.("note");

    const handlePendingEdits = (e) => {
      if (!e.detail) return;
      try {
        setPendingEdits?.(e.detail);
      } catch (err) {}
    };

    window.addEventListener("enterSignInMode", handleSignIn);
    window.addEventListener("enterDraftMode", handleDraft);
    window.addEventListener("pendingEditsUpdated", handlePendingEdits);

    return () => {
      window.removeEventListener("enterSignInMode", handleSignIn);
      window.removeEventListener("enterDraftMode", handleDraft);
      window.removeEventListener("pendingEditsUpdated", handlePendingEdits);
    };
  }, [setMode, setPendingEdits, setVerifyId, setVerifyMemo, setVerifyAmount, setVerifyRequestId]);

  // Memo controller logic (formerly useFeedbackController)
  const address = profile?.address;

  // Update verify memo when in signin mode with pending edits
  useEffect(() => {
    if (mode !== "signin") return;
    const zId = verify?.zId || null;
    if (!zId) return;
    const requestId = verify?.requestId || null;

    const hasEdits = pendingEdits && (
      (pendingEdits.profile && Object.keys(pendingEdits.profile).length > 0) ||
      (Array.isArray(pendingEdits.l) && pendingEdits.l.length > 0)
    );

    const profileDiff = {
      ...(pendingEdits?.profile || {}),
      l: pendingEdits?.l || [],
    };

    const nextMemo = buildZcashEditMemo(hasEdits ? profileDiff : {}, zId, requestId);
    if (nextMemo !== verify?.memo) {
      setVerifyMemo?.(nextMemo);
    }
  }, [mode, verify?.zId, verify?.requestId, pendingEdits, verify?.memo, setVerifyMemo]);

  // Computed URIs
  const uri = useMemo(() => {
    const memo = draft?.memo || "";
    const amount = draft?.amount || "0";
    return buildZcashUri(address, amount, memo);
  }, [address, draft]);

  const verifyUri = useMemo(() => {
    const memo = verify?.memo || "";
    const amount = verify?.amount || "0";
    return buildZcashUri(address, amount, memo);
  }, [address, verify]);

  const copyUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uri);
    } catch { void 0; }
  }, [uri]);

  const openWallet = useCallback(() => {
    if (!uri) return;
    window.open(uri, "_blank");
  }, [uri]);

  // Swap callbacks
  const handleGetQuote = useCallback(async () => {
    if (!swapContext.getQuote || !profile?.address) return;
    await swapContext.getQuote({
      amountIn: swapContext.swapAmount,
      destAddress: profile.address,
      fromToken: swapContext.originTokenId,
      toToken: swapContext.zecTokenId,
      refund: swapContext.refundAddress,
      slippage: swapContext.slippageTolerance,
    });
  }, [swapContext, profile]);

  const handleConfirmQuote = useCallback(async () => {
    if (!swapContext.confirmSwap || !profile?.address || !swapContext.quotePreview) return;
    await swapContext.confirmSwap({
      amountIn: swapContext.swapAmount,
      destAddress: profile.address,
      fromToken: swapContext.originTokenId,
      toToken: swapContext.zecTokenId,
      refund: swapContext.refundAddress,
      slippage: swapContext.slippageTolerance,
    });
  }, [swapContext, profile]);

  // Effects - Data Fetching
  useEffect(() => {
    async function loadProfile() {
      try {
        const { slug } = await params;
        const fetchedProfile = await fetchProfileForSlug(slug);

        if (!fetchedProfile) {
          setNotFoundState(true);
          return;
        }

        const [count, dupCount] = await Promise.all([
          getProfileCount(),
          fetchedProfile.name ? getDuplicateNameCount(fetchedProfile.name) : 0,
        ]);

        setProfile(fetchedProfile);
        setProfileCount(count);
        setDuplicateNameCount(dupCount);
      } catch (error) {
        console.error("Error loading profile:", error);
        setNotFoundState(true);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [params]);

  // Effects - Event Listeners
  useEffect(() => {
    const handler = () => {
      setMode?.("note");
      setForceShowQR?.(false);
    };
    window.addEventListener("forceFeedbackNoteMode", handler);
    return () => window.removeEventListener("forceFeedbackNoteMode", handler);
  }, [setMode, setForceShowQR]);

  // Effects - Document Metadata (Title & Favicon)
  useEffect(() => {
    if (!profile) return;

    const originalTitle = document.title;
    const originalFavicon = document.querySelector("link[rel='icon']")?.href || "/favicon.ico";

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

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);

        let faviconLink = document.querySelector("link[rel='icon']");
        if (!faviconLink) {
          faviconLink = document.createElement("link");
          faviconLink.rel = "icon";
          document.head.appendChild(faviconLink);
        }
        faviconLink.href = canvas.toDataURL("image/png");
      };
      img.src = profile.profile_image_url;
    }

    return () => {
      document.title = originalTitle;
      const faviconLink = document.querySelector("link[rel='icon']");
      if (faviconLink) {
        faviconLink.href = originalFavicon;
      }
    };
  }, [profile]);

  // Early Returns
  if (notFoundState) {
    notFound();
  }

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
    memo: draft?.memo || "",
    amount: draft?.amount || "",
    openWallet,
    setDraftMemo,
    setDraftAmount,
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
          warning={{
            message: `${profile.name} may not be who you think.`,
            link: "#",
          }}
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
                    <>
                      <SwapTokenSelector
                        tokenOptions={swapContext.tokenOptions || []}
                        originTokenId={swapContext.originTokenId}
                        originSymbol={swapContext.originSymbol || ""}
                        onSetToken={swapContext.setToken}
                      />
                      <SwapRefundAddress
                        refundAddress={swapContext.refundAddress || ""}
                        onSetRefundAddress={swapContext.setRefundAddress}
                        tokenBlockchain={swapContext.originBlockchain || ""}
                      />
                      <SwapSettings
                        amount={swapContext.swapAmount || ""}
                        onSetAmount={swapContext.setSwapAmount}
                        slippageTolerance={swapContext.slippageTolerance || "0.5"}
                        onSetSlippageTolerance={swapContext.setSlippageTolerance}
                        onGetQuote={handleGetQuote}
                        onConfirmQuote={handleConfirmQuote}
                        isGettingQuote={swapContext.isGettingQuote || false}
                        isConfirming={swapContext.isConfirming || false}
                        refundAddress={swapContext.refundAddress || ""}
                        quotePreview={swapContext.quotePreview}
                      />
                      <SwapStatusDisplay
                        quoteStatus={swapContext.quoteStatus || ""}
                        swapError={swapContext.swapError || ""}
                        swapStatus={swapContext.swapStatus || ""}
                        isConfirming={swapContext.isConfirming || false}
                      />
                      <SwapRecipientInfo
                        profile={profile}
                        originSymbol={swapContext.originSymbol || ""}
                        depositUri={swapContext.depositUri || ""}
                      />
                      {!swapContext.isConfirming && (
                        <button
                          onClick={swapContext.cancelSwapMode}
                          className="mb-3 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          ← Back to ZEC payment
                        </button>
                      )}
                    </>
                  ) : (
                    <MemoComposer profile={profile} {...memoComposerProps} />
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
