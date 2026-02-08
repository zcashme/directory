import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Profile } from "@/lib/profile/types";

type ZcashFlipDetail = {
  zId: number;
  address: string;
  name: string;
  verified: boolean;
  since: string | null;
};

declare global {
  interface Window {
    lastZcashFlipDetail?: ZcashFlipDetail;
  }
}

interface UseProfileEventsResult {
  showBack: boolean;
  setShowBack: Dispatch<SetStateAction<boolean>>;
}

export default function useProfileEvents(
  profile: Profile | null | undefined
): UseProfileEventsResult {
  const [showBack, setShowBack] = useState(false);

  const profileRef = useRef<Profile | null | undefined>(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const handleEnterSignIn = (event: Event) => {
      setShowBack(true);

      const customEvent = event as CustomEvent<Record<string, unknown> | null>;
      const detail = customEvent.detail as
        | {
            zId?: number | null;
            requestId?: string | null;
          }
        | undefined;

      const p = profileRef.current;
      const profileId = p?.id ?? null;
      const profileAddress = p?.address ?? "";
      const profileName = p?.name ?? "";
      const profileVerified = Boolean(p?.address_verified);
      const profileSince =
        p?.joined_at || p?.created_at || p?.since || null;

      if (!detail && profileId && profileAddress) {
        const payload = {
          zId: profileId,
          address: profileAddress,
          name: profileName,
          verified: profileVerified,
          since: profileSince,
        };

        window.dispatchEvent(
          new CustomEvent("enterSignInMode", {
            detail: payload,
          })
        );

        window.lastZcashFlipDetail = payload;
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
  }, []);

  return { showBack, setShowBack };
}
