import { useEffect, useState } from "react";
import type { Profile } from "@/lib/profile/types";
import { getNsProfilesAction } from "@/lib/directory/getNsProfilesAction";

interface UseNsProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  addProfile: (newProfile: Partial<Profile>) => void;
}

export default function useNsProfiles(
  initialProfiles: Profile[] | null = null,
  revalidate = true
): UseNsProfilesReturn {
  const hasInitial = initialProfiles !== null;

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles || []);
  const [loading, setLoading] = useState(!hasInitial);

  useEffect(() => {
    let active = true;

    async function fetchAllProfiles() {
      if (!revalidate) return;
      if (!hasInitial) setLoading(true);

      try {
        const result = await getNsProfilesAction();

        if (!active) return;

        if (result.ok && Array.isArray(result.data)) {
          setProfiles(result.data);
        }

        if (!hasInitial) setLoading(false);
      } catch (_err) {
        if (!hasInitial) setLoading(false);
      }
    }

    fetchAllProfiles();

    return () => {
      active = false;
    };
  }, [hasInitial, revalidate]);

  const addProfile = (newProfile: Partial<Profile>) => {
    const enriched: Profile = {
      rank_alltime: 0,
      rank_weekly: 0,
      rank_monthly: 0,
      address_verified: false,
      links: [],
      verified_links_count: 0,
      ...newProfile,
      id: newProfile.id || 0,
      name: newProfile.name || "",
      address: newProfile.address || "",
      links: newProfile.links || [],
    };

    setProfiles((prev) => [...prev, enriched]);
  };

  return { profiles, loading, addProfile };
}
