import { useEffect, useState } from "react";
import type { Profile } from "@/lib/profile/types";
import type { UnverifiedLinkData } from "./types";

interface UseProfileModalReturn {
  activeProfile: Profile | null;
  setActiveProfile: (_profile: Profile | null) => void;
  shareStatus: string;
  setShareStatus: (_status: string) => void;
  unverifiedLink: UnverifiedLinkData | null;
  setUnverifiedLink: (_link: UnverifiedLinkData | null) => void;
}

export default function useProfileModal(): UseProfileModalReturn {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [shareStatus, setShareStatus] = useState<string>("");
  const [unverifiedLink, setUnverifiedLink] = useState<UnverifiedLinkData | null>(null);

  useEffect(() => {
    setShareStatus("");
  }, [activeProfile]);

  return {
    activeProfile,
    setActiveProfile,
    shareStatus,
    setShareStatus,
    unverifiedLink,
    setUnverifiedLink,
  };
}
