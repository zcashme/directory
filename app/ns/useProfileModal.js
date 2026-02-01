import { useEffect, useState } from "react";

export default function useProfileModal() {
  const [activeProfile, setActiveProfile] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [unverifiedLink, setUnverifiedLink] = useState(null);

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
