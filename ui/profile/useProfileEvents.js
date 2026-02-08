import { useState, useEffect, useRef } from "react";

export default function useProfileEvents(profile) {
  const [showBack, setShowBack] = useState(false);

  // Store profile in ref so handlers always have latest values without re-registering listeners
  const profileRef = useRef(profile);

  // Update ref whenever profile changes (doesn't trigger re-renders or listener re-registration)
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {

    const handleEnterSignIn = (e) => {
      setShowBack(true);

      // Get latest profile from ref (always current, even if profile prop changed)
      const p = profileRef.current;
      const profileId = p?.id || null;
      const profileAddress = p?.address || "";
      const profileName = p?.name || "";
      const profileVerified = !!(p?.address_verified);
      const profileSince = p?.joined_at || p?.created_at || p?.since || null;

      if (!e?.detail && profileId && profileAddress) {
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
  }, []); // Empty deps - listeners registered once, handlers use refs for latest values

  return { showBack, setShowBack };
}
