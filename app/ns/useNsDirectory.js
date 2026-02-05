import { useEffect, useState } from "react";

import useNsProfiles from "@/ui/ns-directory/useNsProfiles";
import { getProfileLinksBatchAction } from "@/lib/actions/getProfileLinksBatchAction";
import { getLinkIcon, getLinkLabel } from "@/lib/social/profileLinks";

export default function useNsDirectory(initialProfiles) {
  const { profiles, loading, addProfile } = useNsProfiles(initialProfiles, false);
  const [linksByProfileId, setLinksByProfileId] = useState({});
  const [linksError, setLinksError] = useState(null);

  useEffect(() => {
    let isActive = true;
    const ids = profiles.map((profile) => profile.id);
    const idsWithValue = ids.filter((id) => typeof id === "number" || typeof id === "string");
    if (!idsWithValue.length) {
      setLinksByProfileId({});
      return undefined;
    }

    const fetchLinks = async () => {
      const result = await getProfileLinksBatchAction(idsWithValue);

      if (!isActive) return;

      if (!result.ok) {
        setLinksError(result.error || "Failed to fetch links");
        return;
      }

      const map = {};
      Object.entries(result.data || {}).forEach(([zcasherId, links]) => {
        map[zcasherId] = links.map((link) => {
          const icon = getLinkIcon(link.url);
          const domainLabel = getLinkLabel(link.url);
          return { ...link, icon, domainLabel };
        });
      });
      setLinksByProfileId(map);
    };

    fetchLinks();
    return () => {
      isActive = false;
    };
  }, [profiles]);

  return {
    profiles,
    loading,
    addProfile,
    linksByProfileId,
    linksError,
  };
}
