"use client";

import { isNewProfile } from "@/lib/profile/profileUtils";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import NetworkSchoolBadge from "@/ui/profile/NetworkSchoolBadge";
import type { Profile } from "@/lib/profile/types";
import { formatUsername, isTruthyProfileFlag } from "./profileCardUtils";

const RANK_PERIODS = ["alltime", "weekly", "monthly"] as const;

interface ProfileCardListViewProps {
  profile: Profile;
}

const NETWORK_STATE_HREF = "https://ns.com/zcashusersgroup/apply";

export default function ProfileCardListView({ profile }: ProfileCardListViewProps) {
  const displayName = profile.display_name || profile.name || "";
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
  const isNs = isTruthyProfileFlag(profile.is_ns);

  return (
    <VerifiedCardWrapper
      verifiedCount={profile.verified_links_count ?? 0}
      featured={!!profile.featured}
      onClick={() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))}
      className="rounded-2xl p-3 border transition-all cursor-pointer shadow-xs border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)] mb-2"
    >
      <div className="flex items-center gap-4 w-full">
        <ProfileAvatar profile={profile} size={45} imageClassName="object-contain" className="shadow-xs" />
        <div className="flex flex-col grow overflow-hidden min-w-0">
          <span className="font-semibold text-[var(--color-brand-blue)] leading-tight truncate flex items-center gap-2">
            <span className="truncate">{displayName}</span>
            {isNs && <NetworkSchoolBadge href={NETWORK_STATE_HREF} />}
            {isVerified && <VerifiedBadge verified />}
            {isNewProfile(profile) && (
              <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-xs shrink-0">NEW</span>
            )}
          </span>
          <span className="text-xs font-medium text-gray-500 leading-tight">/{formatUsername(profile)}</span>
          <RankBadges profile={profile} />
        </div>
      </div>
    </VerifiedCardWrapper>
  );
}

function RankBadges({ profile }: { profile: Profile }) {
  const hasAwards = RANK_PERIODS.some((p) => {
    const rank = profile[`rank_${p}`] ?? 0;
    return rank > 0 && rank <= 10;
  });
  if (!hasAwards) return null;

  return (
    <div className="text-sm text-gray-500 flex flex-col items-start gap-1 leading-snug mt-1">
      <div className="flex flex-wrap justify-start gap-x-2 gap-y-0.5">
        {RANK_PERIODS.map((period) => {
          const rank = profile[`rank_${period}`];
          if (!rank || rank <= 0) return null;
          return <ReferRankBadgeMulti key={period} rank={rank} period={period === "alltime" ? "all" : period as any} />;
        })}
      </div>
    </div>
  );
}
