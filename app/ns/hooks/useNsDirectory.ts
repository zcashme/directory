import { useCallback, useEffect, useMemo, useState } from "react";
import type { StaticImageData } from "next/image";

import type { Profile, ProfileLink } from "@/lib/profile/types";
import useNsProfiles from "@/ui/ns-directory/useNsProfiles";
import { getProfileLinksBatchAction } from "@/lib/profile/getProfileLinksBatchAction";
import { getLinkIcon, getLinkLabel } from "@/lib/profile/profileLinks";

export interface EnrichedLink extends ProfileLink {
  icon: StaticImageData | string;
  domainLabel: string;
}

export interface LinksByProfileId {
  [zcasherId: string]: EnrichedLink[];
}

interface UseNsDirectoryReturn {
  profiles: Profile[];
  loading: boolean;
  addProfile: (_profile: Profile) => void;
  linksByProfileId: LinksByProfileId;
  linksError: string | null;
}

export default function useNsDirectory(initialProfiles: Profile[] | null): UseNsDirectoryReturn {
  const { profiles, loading, addProfile } = useNsProfiles(initialProfiles, false);
  const [linksByProfileId, setLinksByProfileId] = useState<LinksByProfileId>({});
  const [linksError, setLinksError] = useState<string | null>(null);
  const hasUsername = useCallback((profile: Partial<Profile> | null | undefined): profile is Profile => {
    return typeof profile?.name === "string" && profile.name.trim().length > 0;
  }, []);
  const visibleProfiles = useMemo(
    () => profiles.filter((profile) => hasUsername(profile)),
    [profiles, hasUsername]
  );

  useEffect(() => {
    let isActive = true;
    const ids = visibleProfiles.map((profile: Profile) => profile.id);
    const idsWithValue = ids.filter((id): id is number => typeof id === "number");
    if (!idsWithValue.length) {
      setLinksByProfileId({});
      return undefined;
    }

    const fetchLinks = async () => {
      const result = await getProfileLinksBatchAction(idsWithValue);

      if (!isActive) return;

      if (!result.ok) {
        setLinksError(result.error ?? "Failed to fetch links");
        return;
      }

      const map: LinksByProfileId = {};
      Object.entries(result.data ?? {}).forEach(([zcasherId, links]) => {
        map[zcasherId] = links.map((link): EnrichedLink => {
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
  }, [visibleProfiles]);

  const addProfileWithUsernameGuard = useCallback((profile: Profile) => {
    if (!hasUsername(profile)) return;
    addProfile(profile);
  }, [addProfile, hasUsername]);

  return {
    profiles: visibleProfiles,
    loading,
    addProfile: addProfileWithUsernameGuard,
    linksByProfileId,
    linksError,
  };
}
