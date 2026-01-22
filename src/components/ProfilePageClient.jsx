"use client";

import { useEffect, useMemo } from "react";
import useProfiles from "../hooks/useProfiles";
import { useFeedback } from "../hooks/useFeedback";
import ProfileCard from "./ProfileCard";
import ZcashFeedback from "../ZcashFeedback";
import computeGoodThru from "../utils/computeGoodThru";

export default function ProfilePageClient({ profile }) {
  const { selectedAddress, setSelectedAddress } = useFeedback();
  const { profiles } = useProfiles(profile ? [profile] : null, true);

  useEffect(() => {
    if (profile?.address) {
      setSelectedAddress(profile.address);
    }
  }, [profile?.address, setSelectedAddress]);

  // Dynamic tab title and favicon based on profile
  useEffect(() => {
    if (!profile) return;

    // Store original values
    const originalTitle = document.title;
    const originalFavicon = document.querySelector("link[rel='icon']")?.href || "/favicon.ico";

    // Update title to profile display name or username
    const displayName = profile.display_name || profile.name || "Profile";
    document.title = `${displayName} | Zcash.me`;

    // Update favicon if profile has an avatar (circular)
    if (profile.profile_image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Create a circular favicon using canvas
        const size = 64; // favicon size
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Draw circular clipping mask
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw the image
        ctx.drawImage(img, 0, 0, size, size);

        // Set the favicon
        let faviconLink = document.querySelector("link[rel='icon']");
        if (!faviconLink) {
          faviconLink = document.createElement("link");
          faviconLink.rel = "icon";
          document.head.appendChild(faviconLink);
        }
        faviconLink.href = canvas.toDataURL("image/png");
      };
      img.src = profile.profile_image_url;
    }

    // Cleanup: restore original title and favicon when leaving the page
    return () => {
      document.title = originalTitle;
      const faviconLink = document.querySelector("link[rel='icon']");
      if (faviconLink) {
        faviconLink.href = originalFavicon;
      }
    };
  }, [profile]);

  const selectedProfile = useMemo(() => {
    if (!profile && !profiles?.length) return null;

    const match = selectedAddress
      ? profiles.find((p) => p.address === selectedAddress)
      : null;
    const activeProfile = match || profile;
    if (!activeProfile) return null;

    const joinedAt =
      activeProfile.joined_at ||
      activeProfile.created_at ||
      activeProfile.since ||
      null;
    const good_thru = computeGoodThru(joinedAt, activeProfile.last_signed_at);
    return { ...activeProfile, good_thru };
  }, [profile, profiles, selectedAddress]);

  if (!selectedProfile) return null;

  return (
    <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">
      <ProfileCard
        key={selectedProfile.address}
        profile={selectedProfile}
        onSelect={() => { }}
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
