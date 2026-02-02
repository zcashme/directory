import { useState, useEffect } from "react";

export default function useProfileEvents(profile) {
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const profileId = profile?.id || null;
    const profileAddress = profile?.address || "";
    const profileName = profile?.name || "";
    const profileVerified = !!(profile?.address_verified);
    const profileSince = profile?.joined_at || profile?.created_at || profile?.since || null;

    const handleEnterSignIn = (e) => {
      setShowBack(true);

      if (!e?.detail && profileId && profileAddress) {
        if (!profileId || !profileAddress) {
          console.warn("ProfileCard: profile not ready, skipping verify dispatch");
        } else {
          window.dispatchEvent(
            new CustomEvent("enterSignInMode", {
              detail: {
                zId: profileId,
                address: profileAddress,
                name: profileName,
                verified: profileVerified,
                since: profileSince,
              },
            })
          );

          window.lastZcashFlipDetail = {
            zId: profileId,
            address: profileAddress,
            name: profileName,
            verified: profileVerified,
            since: profileSince,
          };
        }
      }
    };

    const handleEnterDraft = () => {
      setShowBack(false);
    };

    window.addEventListener("enterSignInMode", handleEnterSignIn);
    window.addEventListener("enterDraftMode", handleEnterDraft);
    return () => {
      window.removeEventListener("enterSignInMode", handleEnterSignIn);
      window.removeEventListener("enterDraftMode", handleEnterDraft);
    };
  }, [profile?.id, profile?.address, profile?.name, profile?.joined_at, profile?.created_at, profile?.since, profile?.address_verified]);

  return { showBack, setShowBack };
}
