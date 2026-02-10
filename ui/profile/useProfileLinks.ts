import { useState, type Dispatch, type SetStateAction } from "react";
import type { EnrichedProfileLink, Profile } from "@/lib/profile/types";
import { enrichLink } from "@/lib/profile/profileLinks";

interface UseProfileLinksOptions {
  profile: Profile | null | undefined;
}

interface UseProfileLinksResult {
  linksArray: EnrichedProfileLink[];
  setLinksArray: Dispatch<SetStateAction<EnrichedProfileLink[]>>;
}

export default function useProfileLinks({
  profile,
}: UseProfileLinksOptions): UseProfileLinksResult {
  const [linksArray, setLinksArray] = useState<EnrichedProfileLink[]>(() => {
    const initialLinks = profile?.links;
    const rawLinks = Array.isArray(initialLinks) ? initialLinks : [];
    return rawLinks.map(enrichLink);
  });

  return { linksArray, setLinksArray };
}
