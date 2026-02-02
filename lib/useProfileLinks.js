import { useState, useEffect } from "react";
import { enrichLink } from "@/lib/social/links";

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

    import("@/lib/supabase-client").then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from("zcasher_links")
        .select("id,label,url,is_verified")
        .eq("zcasher_id", profile.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("ƒ?O Error fetching links:", error);
        if (isMounted) {
          setIsLoadingLinks(false);
          setLinksLoaded(true);
        }
        return;
      }
      if (Array.isArray(data) && isMounted) setLinksArray(data.map(enrichLink));
      if (isMounted) {
        setIsLoadingLinks(false);
        setLinksLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fullView, routeMatchesProfile, profile?.id]);

  return { linksArray, setLinksArray, isLoadingLinks, linksLoaded };
}
