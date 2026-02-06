"use client";

// React & Next.js
import { useEffect, useState, useContext, useCallback } from "react";
import { notFound } from "next/navigation";

// Data fetching utilities
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount, getDuplicateNameCount } from "@/lib/profile/profileQueries";

// UI Components - Profile
import ProfileCard from "@/ui/profile/ProfileCard";
import ProfileHeader from "@/ui/profile/ProfileHeader";

// UI Components - Messaging
import MemoComposer from "@/ui/messaging/MemoComposer";

// UI Components - Verification
import ProfileVerification from "@/ui/verification/ProfileVerification";

// UI Components - Swap
import { SwapSettings, SwapStatusDisplay, SwapRecipientInfo, SwapTokenSelector, SwapRefundAddress } from "@/ui/swap/SwapComposer";
import { SwapContext } from "@/app/[slug]/providers/swap-provider";

// Hooks
import { useFeedback, useFeedbackEvents } from "@/ui/messaging/useFeedback";

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

  // Hooks
  const { mode, setMode, setForceShowQR } = useFeedback();
  useFeedbackEvents();

  // Swap context
  const swapContext = useContext(SwapContext) || {};

  // Swap callbacks - ProfilePage orchestrates with context data
  const handleGetQuote = useCallback(async () => {
    if (!swapContext.getQuote || !profile?.address) return;
    await swapContext.getQuote({
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
      setMode("note");
      setForceShowQR(false);
    };
    window.addEventListener("forceFeedbackNoteMode", handler);
    return () => window.removeEventListener("forceFeedbackNoteMode", handler);
  }, [setMode, setForceShowQR]);

  // Effects - Document Metadata (Title & Favicon)
  useEffect(() => {
    if (!profile) return;

    // Store original values
    const originalTitle = document.title;
    const originalFavicon = document.querySelector("link[rel='icon']")?.href || "/favicon.ico";

    // Update title to profile display name or username
    const displayName = profile.display_name || profile.name || "Profile";
    document.title = `${displayName} | Zcash.me`;

    // Update favicon if profile has an avatar (circular)
    if (profile.profile_image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Create a circular favicon using canvas
        const size = 64; // favicon size
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Draw circular clipping mask
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw the image
        ctx.drawImage(img, 0, 0, size, size);

        // Set the favicon
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

    // Cleanup: restore original title and favicon when leaving the page
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
                  <ProfileVerification profile={profile} />
                </ZcashCardWrapper>
              ) : (
                <ZcashCardWrapper>
                  {swapContext.isSwapMode ? (
                    <>
                      <SwapTokenSelector
                        tokenOptions={swapContext.tokenOptions || []}
                        originTokenId={swapContext.originTokenId}
                        originSymbol={swapContext.originSymbol || ""}
                        onSetToken={swapContext.setOriginTokenId || (() => {})}
                      />
                      <SwapRefundAddress
                        refundAddress={swapContext.refundAddress || ""}
                        onSetRefundAddress={swapContext.setRefundAddress || (() => {})}
                        tokenBlockchain={swapContext.originBlockchain || ""}
                      />
                      <SwapSettings
                        slippageTolerance={swapContext.slippageTolerance || "0.5"}
                        onSetSlippageTolerance={swapContext.setSlippageTolerance || (() => {})}
                        onGetQuote={handleGetQuote}
                        onConfirmQuote={handleConfirmQuote}
                        isGettingQuote={swapContext.isGettingQuote || false}
                        isConfirming={swapContext.isConfirming || false}
                        amount={swapContext.swapAmount || ""}
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
                          onClick={swapContext.cancelSwapMode || (() => {})}
                          className="mb-3 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          ← Back to ZEC payment
                        </button>
                      )}
                    </>
                  ) : (
                    <MemoComposer profile={profile} />
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
