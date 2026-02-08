import { useEffect, useState } from "react";
import type { Profile, ProfileLink } from "@/types/index";

interface UseProfileModalReturn {
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile | null) => void;
  shareStatus: string;
  setShareStatus: (status: string) => void;
  unverifiedLink: ProfileLink | null;
  setUnverifiedLink: (link: ProfileLink | null) => void;
}

export default function useProfileModal(): UseProfileModalReturn {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [shareStatus, setShareStatus] = useState<string>("");
  const [unverifiedLink, setUnverifiedLink] = useState<ProfileLink | null>(null);

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
