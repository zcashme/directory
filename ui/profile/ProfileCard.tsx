"use client";

import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import {
  isNewProfile,
  getProfileTrust,
  getWarningConfig,
  buildShareUrl,
  getLastVerifiedLabel,
  getUsernameWithDiscriminator
} from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/profile/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import ProfileEditor from "@/ui/profile/ProfileEditor";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import useProfileLinks from "@/ui/profile/useProfileLinks";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  startOAuthVerification,
} from "@/lib/profile/accountAuthFlow";
import AuthExplainerModal from "@/ui/profile/AuthExplainerModal";
import { useEditsStore } from "@/lib/stores/edits";
import SubmitOtp from "@/ui/verification/SubmitOtp";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { EnrichedProfileLink } from "@/lib/profile/types";

import ProfileLinkRow from "./ProfileLinkRow";
import RedirectModal from "./RedirectModal";
import type { ProfileCardProps, LinkRowClasses } from "./profileCardTypes";
import { formatUsername } from "./profileCardUtils";

export type { ProfileCardTextScale } from "./profileCardTypes";

const getDisplayName = (profile: Partial<Profile>) =>
  profile.display_name || profile.name || "";

export default function ProfileCard({
  profile,
  onSelect,
  warning,
  fullView = false,
  duplicateNameCount = 0,
  onShowQR
}: ProfileCardProps) {
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);
  const [authLink, setAuthLink] = useState<EnrichedProfileLink | null>(null);
  const [authRedirectOpen, setAuthRedirectOpen] = useState(false);
  const [authRedirectLabel, setAuthRedirectLabel] = useState("X.com");
  const [showStats, setShowStats] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const { pendingEdits, addLinkAuthToken } = useEditsStore();
  const { linksArray } = useProfileLinks({ profile });
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
      };

  const { verifiedAddress, verifiedLinks, canAuthenticateLinks } = getProfileTrust(profile);
  const selectedAuthProvider = authLink ? getAuthProviderForUrl(authLink.url) : null;
  const authToken = authLink ? getLinkAuthToken(authLink) : null;
  const authPending = authToken && isLinkAuthPending(pendingEdits, authToken);
  const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);
  const hasDuplicateNames = duplicateNameCount > 1;
  // Default to showing trust warnings unless caller explicitly disables via `warning={null}`.
  const warningEnabled = warning !== null;
  const warningConfig = getWarningConfig({ profile, warning: warningEnabled, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames });
  const warningDefaultExpanded = warningConfig?.defaultExpanded;
  const fullLinkRowClasses: LinkRowClasses = {
    row: "flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 min-w-0",
    left: "flex items-center gap-2 shrink-0",
    leftLink: "flex items-center gap-2 shrink-0 hover:text-blue-600 transition-colors",
    right: "flex items-center gap-2 ml-auto min-w-0 text-sm text-gray-600 justify-end flex-1",
    icon: "w-4 h-4 rounded-xs opacity-80",
    label: "font-medium text-gray-800 whitespace-nowrap",
    domain: "flex-1 min-w-0 truncate text-right",
    copyWrapper: "shrink-0",
  };

  const hasAwards =
    (profile?.rank_alltime ?? 0) > 0 ||
    (profile?.rank_weekly ?? 0) > 0 ||
    (profile?.rank_monthly ?? 0) > 0 ||
    (profile?.rank_daily ?? 0) > 0;
  // Keep content position stable while the avatar overlaps the card edge.
  const avatarTopSpacerPx = 64;
  const baseCardTopMarginPx = 64;
  const avatarSizePx = 120;
  const cardOffsetYPx = 7;
  const topActionButtonsTopPx = 16;
  const topActionButtonsHeightPx = 36;
  // Align avatar bottom with the bottom edge of the top action buttons.
  const avatarOverlapOffsetYPx = Math.round(
    (avatarSizePx / 2) - (topActionButtonsTopPx + topActionButtonsHeightPx)
  );

  useEffect(() => {
    if (warningDefaultExpanded === undefined) return;
    setShowDetail(!!warningDefaultExpanded);
  }, [warningDefaultExpanded]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menuContainer = menuContainerRef.current;
      if (!menuContainer) return;
      if (menuContainer.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  const handleAuthBadgeClick = (event: MouseEvent, link: EnrichedProfileLink) => {
    event.stopPropagation();
    if (!link || link.is_verified) return;
    setAuthLink(link);
    setAuthInfoOpen(true);
  };

  const handleAuthenticateLink = () => {
    if (!authLink) return;
    if (!canAuthenticateLinks) return;
    if (selectedAuthProvider) {
      startOAuthVerification({
        providerKey: selectedAuthProvider.key,
        profile,
        url: authLink.url,
        setShowRedirect: setAuthRedirectOpen,
        setRedirectLabel: setAuthRedirectLabel,
      });
      return;
    }
    if (!authToken || authPending) return;
    addLinkAuthToken(authToken);
    setAuthInfoOpen(false);
  };

  if (!fullView) {
    return (
      <VerifiedCardWrapper
        verifiedCount={profile.verified_links_count ?? 0}
        featured={!!profile.featured}
        onClick={() => {
          onSelect?.(profile);
          requestAnimationFrame(() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          );
        }}
        className="rounded-2xl p-3 border transition-all cursor-pointer shadow-xs border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)] mb-2"
      >
        <div className="flex items-center gap-4 w-full">
          <ProfileAvatar
            profile={profile}
            size={45}
            imageClassName="object-contain"
            className="shadow-xs"
          />

          <div className="flex flex-col grow overflow-hidden min-w-0">
            <span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
              <span className="truncate">{getDisplayName(profile)}</span>
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                />
              )}
              {isNewProfile(profile) && (
                <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-xs shrink-0">
                  NEW
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-500 leading-tight">
              /{formatUsername(profile)}
            </span>

            <div className="text-sm text-gray-500 flex flex-col items-start gap-1 leading-snug mt-1">
              {/* Badges */}
              {(hasAwards) && (
                <div className="flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                  {(["alltime", "weekly", "monthly", "daily"] as const).map(period => {
                    const rank = profile[`rank_${period}`];
                    const periodLabel = period === "alltime" ? "all" : period;
                    return rank && rank > 0 && <ReferRankBadgeMulti key={period} rank={rank} period={periodLabel as any} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {
          isOtpOpen && (
            <SubmitOtp
              isOpen={isOtpOpen}
              onClose={() => setIsOtpOpen(false)}
              profile={profile}
            />
          )
        }
      </VerifiedCardWrapper >

    );
  }

  return (
    <div
      style={{
        marginTop: `${baseCardTopMarginPx + cardOffsetYPx}px`,
      }}
    >
      <div
        style={{
          transform: `translateY(${avatarOverlapOffsetYPx}px)`,
        }}
      >
        <VerifiedCardWrapper
          verifiedCount={
            (profile.verified_links_count ?? 0) +
            (profile.address_verified ? 1 : 0)
          }
          featured={!!profile.featured}
          className="relative overflow-visible mx-auto mb-8 p-6 animate-fadeIn text-center max-w-lg"
          data-active-profile
          data-address={profile.address}
        >
      <div
        className={`relative transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180" : ""
          }`}
        style={{
          position: "relative",
          height: "auto",
          transformOrigin: "top center",
          willChange: "transform",
          pointerEvents: "auto",
        }}
      >

        {/* FRONT SIDE */}
        <div
          className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full`}
          style={{ pointerEvents: "auto" }}
        >
          {/* Top buttons row (menu + share) */}
          <div
            className={`absolute left-4 right-4 z-10 flex items-center justify-between transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 backface-hidden"}`}
            style={{ top: `${topActionButtonsTopPx}px` }}
          >
            {/* Menu button */}
            <div ref={menuContainerRef} className="relative">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                aria-expanded={menuOpen}
                {...tapProps}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                title="More options"
              >
                <span
                  aria-hidden="true"
                  className={`inline-block transition-transform ${shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out"} ${menuOpen ? "rotate-90" : "rotate-0"}`}
                >
                  {"\u2630"}
                </span>
              </motion.button>

              {/* Dropdown Menu */}
              <div
                aria-hidden={!menuOpen}
                className={`absolute left-0 mt-2 inline-flex w-max flex-col items-stretch origin-top-left rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden z-50 text-sm text-gray-700 transition-all ${shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out"} ${menuOpen ? "max-h-64 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"}`}
              >
                    {!showStats ? (
                      <button
                        onClick={() => {
                          if (!hasAwards) return; // ignore click if no awards
                          setShowStats(true);
                          setMenuOpen(false);
                        }}
                        disabled={!hasAwards}
                        className={`w-full whitespace-nowrap text-left px-3 py-2 transition-colors ${hasAwards
                          ? "hover:bg-blue-50 text-gray-800"
                          : "text-gray-400 cursor-not-allowed opacity-60"
                          }`}
                      >
                        ⭔ Show Awards
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowStats(false);
                          setMenuOpen(false);
                        }}
                        className="w-full whitespace-nowrap text-left px-3 py-2 hover:bg-blue-50"
                      >
                        ⭔ Hide Awards
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowBack(true);
                        setMenuOpen(false);
                      }}
                      className="w-full whitespace-nowrap text-left px-3 py-2 hover:bg-blue-50"
                    >
                      ↺ Edit Profile
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        // TODO: wire Verify Profile action once flow is defined.
                      }}
                      className="w-full whitespace-nowrap text-left px-3 py-2 hover:bg-blue-50"
                    >
                      ✓ Verify Profile
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsOtpOpen(true);
                      }}
                      className="w-full whitespace-nowrap text-left px-3 py-2 hover:bg-blue-50"
                    >
                      ⛨ Enter Passcode
                    </button>
                  </div>

            </div>

            {/* Share button (top-right) */}
            <motion.button
              onClick={async () => {
                const shareUrl = buildShareUrl(profile);

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `${getDisplayName(profile)} on Zcash.me`,
                      text: "Check out this Zcash profile:",
                      url: shareUrl,
                    });
                    return;
                  } catch {
                    // User cancelled or failed - fall through to clipboard
                  }
                }
                await navigator.clipboard.writeText(shareUrl);
                alert("Profile link copied to clipboard!");
              }}
              {...tapProps}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
              title={`Share ${getDisplayName(profile)}`}
            >
              <img
                src="/assets/icons/share.svg"
                alt="Share"
                className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity"
                aria-hidden="true"
              />
            </motion.button>
          </div>

          {/* Avatar: overlap the top edge so half sits above the card */}
          <div
            className="absolute left-1/2 top-0 z-20"
            style={{
              transform: `translate(-50%, calc(-50% - ${avatarOverlapOffsetYPx}px))`,
            }}
          >
            <ProfileAvatar
              profile={profile}
              size={avatarSizePx}
              imageClassName="object-contain"
              className="mx-auto shadow-xs flex items-center justify-center"
            />
          </div>

          {/* Spacer so content starts below the overlapping avatar */}
          <div style={{ paddingTop: `${avatarTopSpacerPx}px` }} aria-hidden="true" />

          {/* Awards section (animated, appears when Show Awards is active) */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                key="awards"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 20,
                  mass: 0.8,
                }}
                className="flex flex-wrap justify-center gap-2 mt-3 mb-1"
              >
                {(["alltime", "weekly", "monthly", "daily"] as const).map((period) => {
                  const rank = profile[`rank_${period}`];
                  if (!rank || rank <= 0) return null;
                  const periodLabel = period === "alltime" ? "all" : period;
                  return (
                    <ReferRankBadgeMulti
                      key={period}
                      rank={rank}
                      period={periodLabel as any}
                      alwaysOpen
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name & Username Layout */}
          <div className="mt-3 flex flex-col items-center">
            <h2 className="text-3xl font-black text-gray-900 leading-tight flex items-center justify-center gap-2">
              {getDisplayName(profile)}
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                />
              )}
            </h2>
            <div className="text-base font-medium text-gray-500 mt-1">
              /{formatUsername(profile)}
            </div>
          </div>

          {/* Biography (only if present) */}
          {profile.bio && profile.bio.trim() !== "" && (
            <p className="mt-1 text-sm text-gray-700 text-center max-w-[90%] mx-auto whitespace-pre-line break-words">
              {profile.bio}
            </p>
          )}

          {/* Dates */}
          <p className="mt-3 text-xs text-gray-500 flex flex-wrap justify-center gap-x-1 gap-y-0.5">
            {profile.nearest_city_name && (
              <>
                <span className="whitespace-nowrap">
                  Near {profile.nearest_city_name}
                </span>

                <span
                  className="opacity-70 transition-opacity duration-300"
                  aria-hidden="true"
                >
                  •
                </span>
              </>
            )}

            <span className="whitespace-nowrap">
              Joined{" "}
              {new Date(
                profile.joined_at || profile.created_at || profile.since || new Date().toISOString()
              ).toLocaleString("default", {
                month: "short",
                year: "numeric",
              })}
            </span>

            <span
              className="opacity-70 transition-opacity duration-300"
              aria-hidden="true"
            >
              •
            </span>

            <span className="whitespace-nowrap">
              Verified{" "}
              {getLastVerifiedLabel(profile.last_verified_at || profile.last_verified)}
            </span>
          </p>

          {/* Address with integrated copy button and feedback */}
          {profile.address ? (
            <div className="mt-2 flex items-center justify-center">
              <div
                className="flex items-center gap-2 border text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-xs w-fit max-w-[90%] border-gray-300 bg-gray-50"
              >
                <span className="select-all" title={profile.address}>
                  {profile.address
                    ? `${profile.address.slice(0, 6)}...${profile.address.slice(-6)}`
                    : "—"}
                </span>

                {/* QR + Copy Buttons with animated label expansion */}
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {/* QR Button */}
                  <button
                    onClick={onShowQR}
                    className="group flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all px-1 overflow-hidden"
                    title="Show QR"
                  >
                    ▣
                    <span className="inline-block max-w-0 group-hover:max-w-[60px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">
                      QR
                    </span>
                  </button>

                  {/* Copy Button */}
                  <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 italic">—</p>
          )}

          {/* Action tray */}
          <div
            className="relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0"
          >
            {/* Links tray only */}
            <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
              <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                {linksArray.length > 0 ? (
                  linksArray.map((link: EnrichedProfileLink) => (
                    <ProfileLinkRow
                      key={link.id || link.url}
                      link={link}
                      classes={fullLinkRowClasses}
                      badgeOnClick={handleAuthBadgeClick}
                    />
                  ))
                ) : (
                  <p className="italic text-gray-500 text-center">
                    No contributed links yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          {warningConfig && (
            <div
              className={`mt-5 text-xs rounded-md px-4 py-2 border text-center mx-auto w-fit transition-colors duration-300 ${warningConfig.tone === "positive"
                ? "text-green-700 bg-green-50 border-green-200"
                : warningConfig.tone === "neutral"
                  ? "text-gray-700 bg-gray-50 border-gray-200"
                  : warningConfig.tone === "yellow"
                    ? "text-yellow-900 bg-yellow-50 border-yellow-200"
                    : "text-red-600 bg-red-50 border-red-200"
                }`}
            >
              <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
                <span>{warningConfig.summary}</span>
                <button
                  type="button"
                  onClick={() => setShowDetail(!showDetail)}
                  aria-expanded={showDetail}
                  className={`ml-1 whitespace-nowrap hover:underline text-xs font-semibold ${warningConfig.tone === "positive"
                    ? "text-green-700"
                    : warningConfig.tone === "neutral"
                      ? "text-gray-700"
                      : warningConfig.tone === "yellow"
                        ? "text-yellow-900"
                        : "text-red-600"
                    }`}
                >
                  <span className="font-semibold">
                    {showDetail ? "Hide" : (warningConfig.toggleLabel || "Warnings")}
                  </span>{" "}
                  <span
                    aria-hidden="true"
                    className={`inline-block transition-transform duration-300 ease-in-out ${showDetail ? "rotate-180" : "rotate-0"}`}
                  >
                    ▼
                  </span>
                </button>
              </div>

              <div
                aria-hidden={!showDetail}
                className={`overflow-hidden transition-all ${shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out"} ${showDetail ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"}`}
              >
                <div
                  className={`text-xs space-y-1 transition-transform ${shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out"} ${showDetail ? "translate-y-0" : "-translate-y-1"}`}
                >
                  {warningConfig.details.map((line, index) => (
                    <div key={`${warningConfig.tone}-${index}`}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BACK SIDE (auto-expand editable) */}
        <div
          className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${showBack ? "relative h-auto" : ""
            } bg-white rounded-2xl border border-gray-300 shadow-inner p-5 flex flex-col items-center justify-start overflow-visible`}
          style={{ pointerEvents: showBack ? "auto" : "none" }}
        >
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => {
                (window as any).skipZcashFeedbackScroll = true;
                setShowBack(false);
              }}
              title="Return to front"
              aria-label="Return to front"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
            >
              <span>↺</span> {/* ⮌ left arrow, opposite of ⮎ */}

            </button>
          </div>

          <ProfileEditor profile={profile} links={linksArray} />
        </div>

      </div>

      <RedirectModal isOpen={authRedirectOpen} label={authRedirectLabel} />
      <AuthExplainerModal
        isOpen={authInfoOpen && !!authLink}
        canAuthenticate={canAuthenticateLinks}
        authPending={!!authPending}
        authRedirectOpen={authRedirectOpen}
        providerLabel={selectedAuthProvider?.label}
        onClose={() => {
          setAuthInfoOpen(false);
          setAuthLink(null);
        }}
        onAuthenticate={handleAuthenticateLink}
      />

      {isOtpOpen && (
        <SubmitOtp
          isOpen={isOtpOpen}
          onClose={() => setIsOtpOpen(false)}
          profile={profile}
        />
      )}
        </VerifiedCardWrapper>
      </div>
    </div>
  );
}

