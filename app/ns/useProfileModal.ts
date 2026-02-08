import { useEffect, useState } from "react";
import type { Profile, ProfileLink } from "@/lib/profile/types";

interface UseProfileModalReturn {
  activeProfile: Profile | null;
  setActiveProfile: (_profile: Profile | null) => void;
  shareStatus: string;
  setShareStatus: (_status: string) => void;
  unverifiedLink: ProfileLink | null;
  setUnverifiedLink: (_link: ProfileLink | null) => void;
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
