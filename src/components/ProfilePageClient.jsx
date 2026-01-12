"use client";

import { useEffect, useMemo } from "react";
import useProfiles from "../hooks/useProfiles";
import { useFeedback } from "../hooks/useFeedback";
import ProfileCard from "./ProfileCard";
import ProfileHeader from "./ProfileHeader";
import ZcashFeedback from "../ZcashFeedback";
import computeGoodThru from "../utils/computeGoodThru";

export default function ProfilePageClient({ profile }) {
  const { setSelectedAddress } = useFeedback();
  useProfiles(profile ? [profile] : [], false);

  useEffect(() => {
    if (profile?.address) {
      setSelectedAddress(profile.address);
    }
  }, [profile?.address, setSelectedAddress]);

  const selectedProfile = useMemo(() => {
    if (!profile) return null;
    const joinedAt = profile.joined_at || profile.created_at || profile.since || null;
    const good_thru = computeGoodThru(joinedAt, profile.last_signed_at);
    return { ...profile, good_thru };
  }, [profile]);

  if (!selectedProfile) return null;

  return (
    <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">
      <ProfileHeader />
      <ProfileCard
        key={selectedProfile.address}
        profile={selectedProfile}
        onSelect={() => {}}
        fullView
        warning={{
          message: `${selectedProfile.name} may not be who you think.`,
          link: "#",
        }}
      />
      <ZcashFeedback />
    </div>
  );
}
