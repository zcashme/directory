"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { isNewProfile, getProfileTrust, checkDuplicateNames, getWarningConfig, getVerifiedTimeAgo } from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/profile/CopyButton";
import { useFeedback } from "@/ui/messaging/useFeedback";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/directory/ReferRankBadgeMulti";
import { normalizeSlug, buildSlug, buildShareUrl } from "@/lib/profile/normalizeSlugs";
import ProfileEditor from "@/ui/profile/ProfileEditor";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import shareIcon from "@/ui/assets/share.svg";
import { extractDomain, FALLBACK_ICON } from "@/lib/social/profileLinks";
import useProfileEvents from "@/ui/profile/useProfileEvents";
import useProfileLinks from "@/ui/profile/useProfileLinks";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  appendLinkToken,
  startOAuthVerification,
} from "@/lib/social/accountAuthFlow";
import AuthExplainerModal from "@/ui/profile/AuthExplainerModal";

import SubmitOtp from "@/ui/verification/SubmitOtp";
import { motion, AnimatePresence } from "framer-motion";
const Motion = motion;

export function ProfileCardContent({
  profile,
  linksArray = [],
  variant = "default", // "default" | "mobile" | "compact"
  showLinks = true,
  showAddress = true,
  showBio = true,
  showDates = true,
  showQRButton = false,
  onQRClick,
  linkVariant = "default", // "default" | "simple" - simple doesn't show auth badges
  hideLinkBadges = false, // Hide verification badges on links (for homepage)
  className = "",
}) {
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
  const formatUsername = (value = "") => value.trim().replace(/\s+/g, "_");

  // Size variants
  const sizes = {
    mobile: {
      name: "text-xs",
      username: "text-[9px]",
      bio: "text-[8px]",
      dates: "text-[8px]",
      address: "text-[8px]",
      linkIcon: "w-3 h-3",
      linkLabel: "text-[8px]",
      linkDomain: "text-[7px]",
      addressPadding: "px-2 py-1",
      linkPadding: "px-2 pt-1 pb-1",
      linkGap: "gap-1",
      linkRowGap: "gap-2",
      linkRowPadding: "py-0.5",
    },
    default: {
      name: "text-sm",
      username: "text-[10px]",
      bio: "text-[9px]",
      dates: "text-[9px]",
      address: "text-[9px]",
      linkIcon: "w-3.5 h-3.5",
      linkLabel: "text-[9px]",
      linkDomain: "text-[8px]",
      addressPadding: "px-2.5 py-1.5",
      linkPadding: "px-2.5 pt-1.5 pb-1.5",
      linkGap: "gap-1.5",
      linkRowGap: "gap-2.5",
      linkRowPadding: "py-0.5",
    },
    compact: {
      name: "text-xs",
      username: "text-xs",
      bio: "text-sm",
      dates: "text-xs",
      address: "text-sm",
      linkIcon: "w-4 h-4",
      linkLabel: "text-sm",
      linkDomain: "text-sm",
      addressPadding: "px-3 py-1.5",
      linkPadding: "px-4 pt-2 pb-3",
      linkGap: "gap-2",
    },
  };

  const s = sizes[variant] || sizes.default;

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Display Name */}
      <div className={`relative z-10 flex items-center justify-center gap-1.5`}>
        <span className={`${s.name} font-bold text-gray-900 truncate max-w-full`}>
          {profile.display_name || profile.name}
        </span>
        {isVerified && (
          <span className={`flex-shrink-0 ${variant === "mobile" ? "scale-[0.6]" : variant === "compact" ? "scale-[0.6]" : "scale-[0.6]"} origin-center`}>
            <VerifiedBadge verified={true} />
          </span>
        )}
      </div>

      {/* Username */}
      <p className={`mt-1 ${s.username} text-gray-600 relative z-10`}>@{formatUsername(profile.name)}</p>

      {/* Bio */}
      {showBio && profile.bio && profile.bio.trim() !== "" && (
        <p className={`mt-1 ${s.bio} text-gray-700 line-clamp-2 leading-relaxed px-1 relative z-10 break-words`}>
          {profile.bio}
        </p>
      )}

      {/* Dates */}
      {showDates && (
        <p className={`mt-3 ${s.dates} text-gray-500 flex flex-wrap justify-center gap-x-1 gap-y-0.5 relative z-10`}>
          {profile.nearest_city_name && (
            <>
              <span className="whitespace-nowrap">Near {profile.nearest_city_name}</span>
              <span className="opacity-70 transition-opacity duration-300" aria-hidden="true">•</span>
            </>
          )}
          <span className="whitespace-nowrap">
            Joined{" "}
            {new Date(profile.joined_at || profile.created_at || profile.since).toLocaleString("default", {
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="opacity-70 transition-opacity duration-300" aria-hidden="true">•</span>
          <span className="whitespace-nowrap">
            Verified {getVerifiedTimeAgo(profile.last_verified_at || profile.last_verified)}
          </span>
        </p>
      )}

      {/* Address with copy button */}
      {showAddress && profile.address && (
        <div className="mt-2 flex items-center justify-center relative z-10">
          <div className={`flex items-center gap-2 border text-gray-700 font-mono ${s.address} rounded-full ${s.addressPadding} shadow-xs w-fit max-w-[90%] border-gray-300 bg-gray-50`}>
            <span className="select-all" title={profile.address}>
              {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
            </span>
            {showQRButton && onQRClick ? (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <button
                  onClick={onQRClick}
                  className="group flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all px-1 overflow-hidden"
                  title="Show QR"
                >
                  ▣
                  <span className="inline-block max-w-0 group-hover:max-w-[60px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">
                    QR
                  </span>
                </button>
                <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" />
              </div>
            ) : (
              <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" />
            )}
          </div>
        </div>
      )}

      {/* Links */}
      {showLinks && linksArray && linksArray.length > 0 && (
        <div className={`mt-5 flex-1 min-h-0 w-full relative z-10 flex flex-col flex-grow`}>
          <div className="rounded-2xl border border-gray-300 bg-gray-50/50 shadow-inner transition-all overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className={`${s.linkPadding} flex flex-col ${s.linkGap} flex-1 min-h-0 overflow-y-auto`}>
              {linksArray.slice(0, 3).map((link, i) => {
                const isDiscordLink = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com|discord\.gg)\//i.test(link.url || "");
                const canLinkLeft = !(isDiscordLink && !link.is_verified);
                return (
                  <div
                    key={link.id || i}
                    className={`flex items-center ${s.linkRowGap} ${s.linkRowPadding} border-b border-gray-100 last:border-0 min-w-0 flex-shrink-0`}
                  >
                    <div className={`flex items-center ${s.linkGap} shrink-0 min-w-0`}>
                      {canLinkLeft ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center ${s.linkGap} shrink-0 hover:text-blue-600 transition-colors min-w-0`}
                        >
                          <img
                            src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                            alt=""
                            className={`${s.linkIcon} rounded-xs opacity-80 flex-shrink-0`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <span className={`font-medium ${s.linkLabel} text-gray-800 truncate`}>
                            {link.label}
                          </span>
                        </a>
                      ) : (
                        <>
                          <img
                            src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                            alt=""
                            className={`${s.linkIcon} rounded-xs opacity-80 flex-shrink-0`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <span className={`font-medium ${s.linkLabel} text-gray-800 truncate`}>
                            {link.label}
                          </span>
                        </>
                      )}
                      {!hideLinkBadges && (
                        <VerifiedBadge
                          verified={link.is_verified}
                          verifiedLabel={linkVariant === "simple" ? "Auth" : "Authenticated"}
                          unverifiedLabel={linkVariant === "simple" ? "Not Auth" : "Not Authenticated"}
                        />
                      )}
                    </div>
                    <div className={`flex items-center ${s.linkGap} ml-auto min-w-0 text-gray-600 justify-end flex-1`}>
                      {isDiscordLink && !link.is_verified ? (
                        <>
                          <span className={`flex-1 min-w-0 truncate text-right ${s.linkDomain}`}>{link.label}</span>
                          <CopyButton text={link.label} label="Copy" copiedLabel="Copied" />
                        </>
                      ) : (
                        <>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`flex-1 min-w-0 truncate text-right hover:text-blue-600 transition-colors ${s.linkDomain}`}
                          >
                            {extractDomain(link.url)}
                          </a>
                          <CopyButton text={link.url} label="Copy" copiedLabel="Copied" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {linksArray.length > 3 && (
                <span className={`${s.linkDomain} text-gray-500 text-center pt-1`}>
                  +{linksArray.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Profile Footer - Fixed at bottom */}
      <div className={`mt-auto pt-3 pb-2 flex items-center justify-center gap-1`}>
        <span className={`${variant === "mobile" ? "text-[7px]" : "text-[8px]"} text-gray-500 font-medium`}>
          View Profile
        </span>
        <svg
          className={`${variant === "mobile" ? "w-2.5 h-2.5" : "w-3 h-3"} text-gray-500`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

function RedirectModal({ isOpen, label }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
        <div className="mb-4 text-blue-500">
          <svg className="w-12 h-12 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Redirecting to {label}</h3>
        <p className="text-sm text-gray-600">
          Please authorize the app to verify your profile.
        </p>
      </div>
    </div>
  );
}

export default function ProfileCard({ profile, onSelect, warning, fullView = false }) {
  // onSelect is optional - only used in compact mode for navigation
  // --- Hooks ---
  const pathname = usePathname();
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);
  const [authLink, setAuthLink] = useState(null);
  const [authRedirectOpen, setAuthRedirectOpen] = useState(false);
  const [authRedirectLabel, setAuthRedirectLabel] = useState("X.com");
  const [showStats, setShowStats] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { showBack, setShowBack } = useProfileEvents(profile);
  const { setForceShowQR, pendingEdits, setPendingEdits } = useFeedback();
  const routeMatchesProfile = useMemo(() => {
    if (!fullView) return true;
    const expected = buildSlug(profile);
    if (!expected) return false;
    const currentRaw = decodeURIComponent((pathname || "/").slice(1));
    const current = normalizeSlug(currentRaw);
    return current === normalizeSlug(expected);
  }, [fullView, profile, pathname]);
  const { linksArray, setLinksArray, isLoadingLinks, linksLoaded } = useProfileLinks(profile, fullView, routeMatchesProfile);

  // --- Derived values ---
  const { verifiedAddress, verifiedLinks, isVerified, canAuthenticateLinks } = getProfileTrust(profile);
  const selectedAuthProvider = authLink ? getAuthProviderForUrl(authLink.url) : null;
  const authToken = authLink ? getLinkAuthToken(authLink) : null;
  const authPending = authToken && isLinkAuthPending(pendingEdits, authToken);
  const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);
  const showLinkShimmer =
    isLoadingLinks || (fullView && (!routeMatchesProfile || !linksLoaded));
  const cachedProfiles =
    typeof window !== "undefined" ? window.cachedProfiles : null;
  const { hasDuplicateNames } = checkDuplicateNames(profile, cachedProfiles);
  const warningConfig = getWarningConfig({ profile, warning, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames });
  const hasAwards =
    (profile?.rank_alltime ?? 0) > 0 ||
    (profile?.rank_weekly ?? 0) > 0 ||
    (profile?.rank_monthly ?? 0) > 0 ||
    (profile?.rank_daily ?? 0) > 0;

  useEffect(() => {
    if (!warningConfig) return;
    setShowDetail(!!warningConfig.defaultExpanded);
  }, [warningConfig?.summary, warningConfig?.toggleLabel, warningConfig?.tone, warningConfig?.defaultExpanded]);

  // --- Helpers & handlers ---
  const formatUsername = (value = "") =>
    value.trim().replace(/\s+/g, "_");

  const handleAuthBadgeClick = (event, link) => {
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
    appendLinkToken(pendingEdits, setPendingEdits, authToken);
    setAuthInfoOpen(false);
  };

  if (!fullView) {
    // Compact card - uses onSelect callback for navigation (if provided)
    return (
      <VerifiedCardWrapper
        verifiedCount={profile.verified_links_count ?? 0}
        featured={profile.featured}
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
            showFallbackIcon
          />

          <div className="flex flex-col grow overflow-hidden min-w-0">
            <span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
              <span className="truncate">{profile.display_name || profile.name}</span>
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                  verifiedCount={
                    (profile.verified_links_count ?? 0) +
                    (profile.address_verified ? 1 : 0)
                  }
                />
              )}
              {isNewProfile(profile) && (
                <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-xs shrink-0">
                  NEW
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-500 leading-tight">
              @{formatUsername(profile.name)}
            </span>

            <div className="text-sm text-gray-500 flex flex-col items-start gap-1 leading-snug mt-1">
              {/* Badges */}
              {(hasAwards) && (
                <div className="flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                  {["alltime", "weekly", "monthly", "daily"].map(period => {
                    const rank = profile[`rank_${period}`];
                    return rank > 0 && <ReferRankBadgeMulti key={period} rank={rank} period={period.replace("time", "")} />;
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

  // Full card
  return (
    <VerifiedCardWrapper
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
      featured={profile.featured}
      className="relative mx-auto mt-3 mb-8 p-6 animate-fadeIn text-center max-w-lg"
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
        }}
      >

        {/* FRONT SIDE */}
        <div
          className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full`}
        >
          {/* Top buttons row (menu + share) */}
          <div className={`absolute top-4 left-4 right-4 z-10 flex items-center justify-between transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 backface-hidden"}`}>
            {/* Menu button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                title="More options"
              >
                ☰
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute left-0 mt-2 w-36 rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden z-50 text-sm text-gray-700">
                  {!showStats ? (
                    <button
                      onClick={() => {
                        if (!hasAwards) return; // ignore click if no awards
                        setShowStats(true);
                        setMenuOpen(false);
                      }}
                      disabled={!hasAwards}
                      className={`w-full text-left px-4 py-2 transition-colors ${hasAwards
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
                      className="w-full text-left px-4 py-2 hover:bg-blue-50"
                    >
                      ⭔ Hide Awards
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowBack(true);
                      setMenuOpen(false);
                      window.dispatchEvent(
                        new CustomEvent("enterSignInMode", {
                          detail: {
                            zId: profile.id,
                            address: profile.address || "",
                            name: profile.name || "",
                            verified: !!profile.address_verified,
                            since: profile.since || null,
                          },
                        })
                      );
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50"
                  >
                    ↺ Edit Profile
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setIsOtpOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50"
                  >
                    ⛨ Enter Passcode
                  </button>

                </div>
              )}

            </div>

            {/* Share button (top-right) */}
            <button
              onClick={() => {
                const shareUrl = buildShareUrl(profile);

                if (navigator.share) {
                  navigator
                    .share({
                      title: `${profile.display_name || profile.name} on Zcash.me`,
                      text: "Check out this Zcash profile:",
                      url: shareUrl,
                    })
                    .catch(() => { });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Profile link copied to clipboard!");
                }
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
              title={`Share ${profile.display_name || profile.name}`}
            >
              <img
                src={shareIcon}
                alt="Share"
                className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity"
              />
            </button>
          </div>

          {/* Avatar */}
          <ProfileAvatar
            profile={profile}
            size={80}
            imageClassName="object-contain"
            className="mx-auto shadow-xs flex items-center justify-center"
            showFallbackIcon
            blink
            lookAround
          />

          {/* Awards section (animated, appears when Show Awards is active) */}
          <AnimatePresence>
            {showStats && (
              <Motion.div
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
                {(profile.rank_alltime ?? 0) > 0 && (
                  <ReferRankBadgeMulti
                    rank={profile.rank_alltime}
                    period="all"
                    alwaysOpen
                  />
                )}
                {(profile.rank_weekly ?? 0) > 0 && (
                  <ReferRankBadgeMulti
                    rank={profile.rank_weekly}
                    period="weekly"
                    alwaysOpen
                  />
                )}
                {(profile.rank_monthly ?? 0) > 0 && (
                  <ReferRankBadgeMulti
                    rank={profile.rank_monthly}
                    period="monthly"
                    alwaysOpen
                  />
                )}
                {(profile.rank_daily ?? 0) > 0 && (
                  <ReferRankBadgeMulti
                    rank={profile.rank_daily}
                    period="daily"
                    alwaysOpen
                  />
                )}
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Name & Username Layout */}
          <div className="mt-3 flex flex-col items-center">
            <h2 className="text-3xl font-black text-gray-900 leading-tight flex items-center justify-center gap-2">
              {profile.display_name || profile.name}
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                  verifiedCount={
                    (profile.verified_links_count ?? 0) +
                    (profile.address_verified ? 1 : 0)
                  }
                />
              )}
            </h2>
            <div className="text-base font-medium text-gray-500 mt-1">
              @{formatUsername(profile.name)}
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
                profile.joined_at || profile.created_at || profile.since
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
              {getVerifiedTimeAgo(profile.last_verified_at || profile.last_verified)}
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
                    : "â€”"}
                </span>

                {/* QR + Copy Buttons with animated label expansion */}
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {/* QR Button */}
                  <button
                    onClick={() => {
                      // Explicit QR-open request (ONLY triggered by QR icon click)
                      if (typeof setForceShowQR === "function") {
                        setForceShowQR(Date.now());
                      }

                      // Scroll ONLY because user intentionally pressed QR button
                      setTimeout(() => {
                        const el = document.getElementById("zcash-feedback");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 400);
                    }}
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
            <p className="mt-2 text-sm text-gray-500 italic">â€”</p>
          )}

          {/* Action tray */}
          <div
            className="relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0"
          >
            {/* Links tray only */}
            <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
              <div className={showLinkShimmer ? "px-4 py-3 bg-transparent/70 border-t border-gray-200" : "px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2"}>
                {showLinkShimmer ? (
                  <div className="link-tray-shimmer h-10 w-full rounded-md" />
                ) : linksArray.length > 0 ? (
                  linksArray.map((link) => {
                    const isDiscordLink = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com|discord\.gg)\//i.test(link.url || "");
                    const canLinkLeft = !(isDiscordLink && !link.is_verified);
                    return (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 min-w-0"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        {canLinkLeft ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 shrink-0 hover:text-blue-600 transition-colors"
                          >
                            <img
                              src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                              alt=""
                              className="w-4 h-4 rounded-xs opacity-80"
                            />
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {link.label}
                            </span>
                          </a>
                        ) : (
                          <>
                            <img
                              src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                              alt=""
                              className="w-4 h-4 rounded-xs opacity-80"
                            />
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {link.label}
                            </span>
                          </>
                        )}
                        <VerifiedBadge
                          verified={link.is_verified}
                          verifiedLabel="Authenticated"
                          unverifiedLabel="Not Authenticated"
                          onClick={
                            link.is_verified
                              ? undefined
                              : (event) => handleAuthBadgeClick(event, link)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto min-w-0 text-sm text-gray-600 justify-end flex-1">
                        {(() => {
                          if (isDiscordLink && !link.is_verified) {
                            return (
                              <>
                                <span className="flex-1 min-w-0 truncate text-right">
                                  {link.label}
                                </span>
                                <div className="shrink-0">
                                  <CopyButton text={link.label} label="Copy" copiedLabel="Copied" />
                                </div>
                              </>
                            );
                          }
                          return (
                            <>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0 truncate text-right hover:text-blue-600 transition-colors"
                              >
                                {extractDomain(link.url)}
                              </a>
                              <div className="shrink-0">
                                <CopyButton text={link.url} label="Copy" copiedLabel="Copied" />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                  })
                ) : linksLoaded ? (
                  <p className="italic text-gray-500 text-center">
                    No contributed links yet.
                  </p>
                ) : null}
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
                  <span aria-hidden="true">{showDetail ? "▲" : "▼"}</span>
                </button>
              </div>

              {showDetail && (
                <div className="mt-1 text-xs space-y-1">
                  {warningConfig.details.map((line, index) => (
                    <div key={`${warningConfig.tone}-${index}`}>
                      {typeof line === "string" ? line : line.type === "duplicateNameLink" ? (
                        <>
                          Multiple profiles use this{" "}
                          <a
                            href={line.nameSearchUrl}
                            className="text-blue-600 hover:underline"
                            onClick={(event) => {
                              if (event.button !== 0) return;
                              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                              if (typeof window !== "undefined") {
                                sessionStorage.setItem("suppressSearchDropdown", "1");
                              }
                            }}
                          >
                            name
                          </a>
                          .
                        </>
                      ) : line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BACK SIDE (auto-expand editable) */}
        <div
          className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${showBack ? "relative h-auto" : ""
            } bg-white rounded-2xl border border-gray-300 shadow-inner p-5 flex flex-col items-center justify-start overflow-visible`}
        >
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => {
                // tell feedback NOT to auto-scroll
                window.skipZcashFeedbackScroll = true;

                setShowBack(false);
                window.dispatchEvent(new CustomEvent("enterDraftMode"));
                window.dispatchEvent(new CustomEvent("forceFeedbackNoteMode"));
              }}

              title="Return to front"
              aria-label="Return to front"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
            >
              <span>↺</span> {/* â®Œ left arrow, opposite of â®Ž */}

            </button>
          </div>

          <ProfileEditor profile={profile} links={linksArray} />
        </div>

      </div>

      <RedirectModal isOpen={authRedirectOpen} label={authRedirectLabel} />
      <AuthExplainerModal
        isOpen={authInfoOpen && !!authLink}
        canAuthenticate={canAuthenticateLinks}
        authPending={authPending}
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
  );
}

