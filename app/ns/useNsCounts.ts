import { useMemo } from "react";
import type { Profile } from "@/types/index";

import {
  hasRank,
  isNsProfile,
  isTruthyFlag,
  isVerifiedProfile,
} from "./directoryNsUtils";

interface NsCounts {
  nsCount: number;
  verifiedCount: number;
  rankedCount: number;
  coreCount: number;
  longtermCount: number;
}

export default function useNsCounts(profiles: Profile[]): NsCounts {
  return useMemo<NsCounts>(() => {
    const counts: NsCounts = {
      nsCount: 0,
      verifiedCount: 0,
      rankedCount: 0,
      coreCount: 0,
      longtermCount: 0,
    };

    profiles.forEach((profile) => {
      if (!isNsProfile(profile)) return;
      counts.nsCount += 1;
      if (isVerifiedProfile(profile)) counts.verifiedCount += 1;
      if (hasRank(profile)) counts.rankedCount += 1;
      if (isTruthyFlag(profile?.is_ns_core)) counts.coreCount += 1;
      if (isTruthyFlag(profile?.is_ns_longterm)) counts.longtermCount += 1;
    });

    return counts;
  }, [profiles]);
}
