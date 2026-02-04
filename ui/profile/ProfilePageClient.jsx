"use client";

import { useEffect } from "react";
import ProfileCard from "@/ui/profile/ProfileCard";
import MemoComposer from "@/ui/messaging/MemoComposer";
import ProfileVerification from "@/ui/verification/ProfileVerification";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { useFeedback, useFeedbackEvents } from "@/ui/messaging/useFeedback";

function ZcashCardWrapper({ title, children }) {
  return (
    <div className="p-0 mt-4 bg-transparent shadow-none border-none rounded-none">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function ProfilePageClient({ profile }) {
  const { mode, setMode, setForceShowQR } = useFeedback();
  useFeedbackEvents();

  // Listen for forceFeedbackNoteMode (dispatched by ProfileCard QR button)
  useEffect(() => {
    const handler = () => {
      setMode("note");
      setForceShowQR(false);
    };
    window.addEventListener("forceFeedbackNoteMode", handler);
    return () => window.removeEventListener("forceFeedbackNoteMode", handler);
  }, [setMode, setForceShowQR]);

  // Dynamic tab title and favicon based on profile
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

  if (!profile) return null;

  return (
    <>
      <ProfileHeader />
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-12 min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <ProfileCard
          key={profile.address}
          profile={profile}
          fullView
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
                <MemoComposer profile={profile} />
              </ZcashCardWrapper>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
