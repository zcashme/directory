import { useEffect, useState } from "react";

import useProfiles from "../useProfiles";
import { supabase } from "../../supabase";
import { isNsProfile } from "../../utils/directoryNsUtils";
import { getLinkIcon, getLinkLabel } from "../../utils/linkUtils";

export default function useNsDirectory(initialProfiles) {
  const { profiles, loading, addProfile } = useProfiles(initialProfiles, true);
  const [linksByProfileId, setLinksByProfileId] = useState({});
  const [linksError, setLinksError] = useState(null);

  useEffect(() => {
    let isActive = true;
    const ids = profiles.filter((profile) => isNsProfile(profile)).map((profile) => profile.id);
    const idsWithValue = ids.filter((id) => typeof id === "number" || typeof id === "string");
    if (!idsWithValue.length) {
      setLinksByProfileId({});
      return undefined;
    }

    const fetchLinks = async () => {
      const { data, error } = await supabase
        .from("zcasher_links")
        .select("id,label,url,is_verified,zcasher_id")
        .in("zcasher_id", idsWithValue);

      if (error || !isActive) {
        if (error && isActive) setLinksError(error);
        return;
      }
      const map = {};
      (data || []).forEach((link) => {
        const icon = getLinkIcon(link.url);
        const domainLabel = getLinkLabel(link.url);
        const entry = { ...link, icon, domainLabel };
        map[link.zcasher_id] = map[link.zcasher_id] || [];
        map[link.zcasher_id].push(entry);
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
