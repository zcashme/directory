"use client";

import { isNewProfile } from "@/lib/profile/profileUtils";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import ProfileIdentityBadges from "@/ui/profile/ProfileIdentityBadges";
import type { Profile } from "@/lib/profile/types";
import { formatUsername } from "./profileCardUtils";


interface ProfileCardListViewProps {
  profile: Profile;
}

export default function ProfileCardListView({ profile }: ProfileCardListViewProps) {
  const displayName = profile.display_name || profile.name || "";

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
            <ProfileIdentityBadges profile={profile} />
            {isNewProfile(profile) && (
              <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-xs shrink-0">NEW</span>
            )}
          </span>
          <span className="text-xs font-medium text-gray-500 leading-tight">/{formatUsername(profile)}</span>
        </div>
      </div>
    </VerifiedCardWrapper>
  );
}
