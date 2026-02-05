import { useEffect, useState } from "react";
import { getNsProfilesAction } from "@/lib/actions/getNsProfilesAction";

export default function useNsProfiles(initialProfiles = null, revalidate = true) {
  const hasInitial = initialProfiles !== null;

  const [profiles, setProfiles] = useState(initialProfiles || []);
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
        } else if (process.env.NODE_ENV === "development") {
          // Fallback for development
          const fallback = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
              address_verified: true,
              verified_links_count: 0,
              links: [],
              bio: "Offline demo profile for local development",
              featured: false,
              rank_alltime: 0,
              rank_weekly: 0,
              rank_monthly: 0,
            },
          ];
          setProfiles(fallback);
        }

        if (!hasInitial) setLoading(false);
      } catch (err) {
        if (process.env.NODE_ENV === "development" && active) {
          const fallback = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
              address_verified: true,
              verified_links_count: 0,
              links: [],
              bio: "Offline demo profile for local development",
              featured: false,
              rank_alltime: 0,
              rank_weekly: 0,
              rank_monthly: 0,
            },
          ];
          setProfiles(fallback);
          if (!hasInitial) setLoading(false);
        }
      }
    }

    fetchAllProfiles();

    return () => {
      active = false;
    };
  }, [hasInitial, revalidate]);

  const addProfile = (newProfile) => {
    const enriched = {
      rank_alltime: 0,
      rank_weekly: 0,
      rank_monthly: 0,
      address_verified: false,
      links: [],
      verified_links_count: 0,
      ...newProfile,
      links: newProfile.links || []
    };

    setProfiles((prev) => [...prev, enriched]);
  };

  return { profiles, loading, addProfile };
}
