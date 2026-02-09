import {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { EnrichedProfileLink, Profile } from "@/lib/profile/types";
import { enrichLink } from "@/lib/profile/profileLinks";
import { getProfileLinksAction } from "@/lib/profile/getProfileLinksAction";

interface UseProfileLinksOptions {
  profile: Profile | null | undefined;
  fullView: boolean;
}

interface UseProfileLinksResult {
  linksArray: EnrichedProfileLink[];
  setLinksArray: Dispatch<SetStateAction<EnrichedProfileLink[]>>;
  isLoadingLinks: boolean;
  linksLoaded: boolean;
}

export default function useProfileLinks({
  profile,
  fullView,
}: UseProfileLinksOptions): UseProfileLinksResult {
  const [linksArray, setLinksArray] = useState<EnrichedProfileLink[]>(() => {
    const initialLinks = profile?.links;
    const rawLinks = Array.isArray(initialLinks) ? initialLinks : [];
    return rawLinks.map(enrichLink);
  });

  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    if (!fullView) return;
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
  }, [fullView, profile?.id]);

  return { linksArray, setLinksArray, isLoadingLinks, linksLoaded };
}
