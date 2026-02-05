import { useState, useEffect } from "react";
import { enrichLink } from "@/lib/social/profileLinks";
import { getProfileLinksAction } from "@/lib/actions/getProfileLinksAction";

export default function useProfileLinks(profile, fullView, routeMatchesProfile) {
  const [linksArray, setLinksArray] = useState(() => {
    let rawLinks = [];
    if (Array.isArray(profile.links)) rawLinks = profile.links;
    else if (typeof profile.links_json === "string") {
      try {
        rawLinks = JSON.parse(profile.links_json);
      } catch {
        rawLinks = [];
      }
    } else if (Array.isArray(profile.links_json)) {
      rawLinks = profile.links_json;
    }
    return rawLinks.map(enrichLink);
  });

  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    if (!fullView) return;
    if (!routeMatchesProfile) {
      setIsLoadingLinks(true);
      setLinksLoaded(false);
      return;
    }
    if (!profile?.id) return;
    let isMounted = true;
    setIsLoadingLinks(true);
    setLinksLoaded(false);

    (async () => {
      const result = await getProfileLinksAction(profile.id);

      if (!isMounted) return;

      if (result.ok && Array.isArray(result.data)) {
        setLinksArray(result.data.map(enrichLink));
      }

      setIsLoadingLinks(false);
      setLinksLoaded(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [fullView, routeMatchesProfile, profile?.id]);

  return { linksArray, setLinksArray, isLoadingLinks, linksLoaded };
}
