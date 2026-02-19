"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfileTrust, getWarningConfig, getLastVerifiedLabel } from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import ProfileEditor from "@/ui/profile/ProfileEditor";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import useProfileLinks from "@/ui/profile/useProfileLinks";
import VerifyProfileModal from "@/ui/verification/VerifyProfileModal";
import { RedirectModal } from "@/ui/profile/editorModals";
import { connectSocial } from "@/ui/links/connect";
import { useConnectCallback } from "@/ui/links/useConnectCallback";
import { upsertVerifiedLink } from "@/ui/links/verifyLink";
import { detectProviderFromUrl } from "@/ui/links/providers";
import { PROVIDERS } from "@/ui/links/providers";
import { enrichLink } from "@/lib/profile/profileLinks";
import ProfileCardListView from "./ProfileCardListView";
import ProfileCardActions from "./ProfileCardActions";
import ProfileCardWarning from "./ProfileCardWarning";
import ProfileLinkRow from "./ProfileLinkRow";
import { AnimatePresence, motion } from "framer-motion";
import type { EnrichedProfileLink } from "@/lib/profile/types";
import type { ProfileCardProps, LinkRowClasses } from "./profileCardTypes";
import { formatUsername } from "./profileCardUtils";

export type { ProfileCardTextScale } from "./profileCardTypes";

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));

const RANK_PERIODS = ["alltime", "weekly", "monthly", "daily"] as const;

const LINK_ROW_CLASSES: LinkRowClasses = {
  row: "flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 min-w-0",
  left: "flex items-center gap-2 shrink-0",
  leftLink: "flex items-center gap-2 shrink-0 hover:text-blue-600 transition-colors",
  right: "flex items-center gap-2 ml-auto min-w-0 text-sm text-gray-600 justify-end flex-1",
  icon: "w-4 h-4 rounded-xs opacity-80",
  label: "font-medium text-gray-800 whitespace-nowrap",
  domain: "flex-1 min-w-0 truncate text-right",
  copyWrapper: "shrink-0",
};

export default function ProfileCard({
  profile,
  fullView = false,
  duplicateNameCount = 0,
  onShowQR,
  onEditorModeChange,
}: ProfileCardProps) {
  const router = useRouter();
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("");
  const { linksArray, setLinksArray } = useProfileLinks({ profile });

  const { verifiedAddress, verifiedLinks } = getProfileTrust(profile);
  const totalLinks = profile.total_links ?? linksArray.length;
  const warningConfig = getWarningConfig({ profile, warning: true, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames: duplicateNameCount > 1 });
  const hasAwards = RANK_PERIODS.some((p) => (profile[`rank_${p}`] ?? 0) > 0);
  const displayName = profile.display_name || profile.name || "";
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;

  const handleVerifyClick = useCallback(async (link: { url: string }) => {
    if (!profile.address_verified) return;
    const providerKey = detectProviderFromUrl(link.url || "");
    if (!providerKey || !PROVIDERS[providerKey]) return;

    setShowRedirect(true);
    setRedirectLabel(PROVIDERS[providerKey].label);

    try {
      await connectSocial(providerKey, {
        profileId: profile.id,
        returnPath: window.location.pathname,
      });
    } catch {
      setShowRedirect(false);
    }
  }, [profile.id]);

  const handleConnected = useCallback(async (link: { url: string; provider: string; handle: string; accessToken: string }) => {
    setShowRedirect(false);
    const result = await upsertVerifiedLink(profile.id, link.url, link.accessToken);
    if (result.ok) {
      setLinksArray((prev) =>
        prev.map((l) =>
          l.url === link.url ? enrichLink({ ...l, is_verified: true }) : l
        )
      );
      router.refresh();
    }
  }, [profile.id, setLinksArray, router]);

  const handleConnectError = useCallback(() => {
    setShowRedirect(false);
  }, []);

  useConnectCallback({
    profileId: profile.id,
    onConnected: handleConnected,
    onError: handleConnectError,
  });

  useEffect(() => { onEditorModeChange?.(showBack); }, [showBack, onEditorModeChange]);

  if (!fullView) return <ProfileCardListView profile={profile} />;

  return (
    <div style={{ marginTop: `${CARD_TOP_MARGIN + CARD_OFFSET_Y}px` }}>
      <div style={{ transform: `translateY(${AVATAR_OVERLAP_Y}px)` }}>
        <VerifiedCardWrapper
          verifiedCount={(profile.verified_links_count ?? 0) + (profile.address_verified ? 1 : 0)}
          featured={!!profile.featured}
          className="relative overflow-visible mx-auto mb-8 p-6 animate-fadeIn text-center max-w-lg"
          data-active-profile
          data-address={profile.address}
        >
          {/* Flip container */}
          <div
            className={`relative transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180" : ""}`}
            style={{ transformOrigin: "top center", willChange: "transform" }}
          >
            {/* FRONT */}
            <div
              className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full`}
            >
              {/* Actions row */}
              <div
                className={`absolute left-4 right-4 z-10 flex items-center justify-between transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 backface-hidden"}`}
                style={{ top: `${ACTION_BUTTONS_TOP}px` }}
              >
                <ProfileCardActions
                  profile={profile}
                  hasAwards={hasAwards}
                  showStats={showStats}
                  onToggleStats={() => setShowStats((p) => !p)}
                  onEdit={() => setShowBack(true)}
                  onVerify={() => setIsVerifyOpen(true)}
                />
              </div>

              {/* Avatar */}
              <div className="absolute left-1/2 top-0 z-20" style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px))` }}>
                <ProfileAvatar profile={profile} size={AVATAR_SIZE} imageClassName="object-contain" className="mx-auto shadow-xs flex items-center justify-center" />
              </div>
              <div style={{ paddingTop: `${AVATAR_SPACER}px` }} aria-hidden />

              {/* Awards */}
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    key="awards"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.8 }}
                    className="flex flex-wrap justify-center gap-2 mt-3 mb-1"
                  >
                    {RANK_PERIODS.map((period) => {
                      const rank = profile[`rank_${period}`];
                      if (!rank || rank <= 0) return null;
                      return <ReferRankBadgeMulti key={period} rank={rank} period={period === "alltime" ? "all" : period as any} alwaysOpen />;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Identity */}
              <div className="mt-3 flex flex-col items-center">
                <h2 className="text-3xl font-black text-gray-900 leading-tight flex items-center justify-center gap-2">
                  {displayName}
                  {isVerified && <VerifiedBadge verified />}
                </h2>
                <div className="text-base font-medium text-gray-500 mt-1">/{formatUsername(profile)}</div>
              </div>

              {/* Bio */}
              {profile.bio?.trim() && (
                <p className="mt-1 text-sm text-gray-700 text-center max-w-[90%] mx-auto whitespace-pre-line break-words">{profile.bio}</p>
              )}

              {/* Dates */}
              <p className="mt-3 text-xs text-gray-500 flex flex-wrap justify-center gap-x-1 gap-y-0.5">
                {profile.nearest_city_name && (
                  <><span className="whitespace-nowrap">Near {profile.nearest_city_name}</span><span className="opacity-70" aria-hidden>•</span></>
                )}
                <span className="whitespace-nowrap">
                  Joined {new Date(profile.joined_at || profile.created_at || profile.since || new Date().toISOString()).toLocaleString("default", { month: "short", year: "numeric" })}
                </span>
                <span className="opacity-70" aria-hidden>•</span>
                <span className="whitespace-nowrap">Verified {getLastVerifiedLabel(profile.last_verified_at || profile.last_verified)}</span>
              </p>

              {/* Address */}
              {profile.address ? (
                <div className="mt-2 flex items-center justify-center">
                  <div className="flex items-center gap-2 border text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-xs w-fit max-w-[90%] border-gray-300 bg-gray-50">
                    <span className="select-all" title={profile.address}>
                      {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                    </span>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <button onClick={onShowQR} className="group flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all px-1 overflow-hidden" title="Show QR">
                        ▣<span className="inline-block max-w-0 group-hover:max-w-[60px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">QR</span>
                      </button>
                      <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500 italic">—</p>
              )}

              {/* Links */}
              <div className="relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0">
                <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
                  <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                    {linksArray.length > 0
                      ? linksArray.map((link: EnrichedProfileLink) => <ProfileLinkRow key={link.id || link.url} link={link} classes={LINK_ROW_CLASSES} onVerifyClick={profile.address_verified ? handleVerifyClick : undefined} />)
                      : <p className="italic text-gray-500 text-center">No contributed links yet.</p>}
                  </div>
                </div>
              </div>

              {/* Warning */}
              {warningConfig && <ProfileCardWarning config={warningConfig} />}
            </div>

            {/* BACK */}
            <div
              className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${showBack ? "relative h-auto" : ""} bg-white rounded-2xl border border-gray-300 shadow-inner p-5 flex flex-col items-center justify-start overflow-visible`}
              style={{ pointerEvents: showBack ? "auto" : "none" }}
            >
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={() => { (window as any).skipZcashFeedbackScroll = true; setShowBack(false); }}
                  title="Return to front"
                  aria-label="Return to front"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
                >↺</button>
              </div>
              <ProfileEditor profile={profile} links={linksArray} onAuthenticateLink={profile.address_verified ? (link) => handleVerifyClick(link as EnrichedProfileLink) : undefined} />
            </div>
          </div>

          {isVerifyOpen && <VerifyProfileModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} profile={profile} />}
          <RedirectModal isOpen={showRedirect} label={redirectLabel} />
        </VerifiedCardWrapper>
      </div>
    </div>
  );
}
