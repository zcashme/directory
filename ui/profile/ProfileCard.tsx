"use client";

import React, { useState, useEffect } from "react";
import { isNewProfile, getProfileTrust, getWarningConfig, getLastVerifiedLabel } from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/profile/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import ProfileEditor from "@/ui/profile/ProfileEditor";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import shareIcon from "@/ui/assets/share.svg";
import { extractDomain, FALLBACK_ICON, isDiscordLink } from "@/lib/profile/profileLinks";
import useProfileLinks from "@/ui/profile/useProfileLinks";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  startOAuthVerification,
} from "@/lib/profile/accountAuthFlow";
import AuthExplainerModal from "@/ui/profile/AuthExplainerModal";
import { useMessagingStore } from "@/lib/stores/messaging";
import { useSelectionStore } from "@/lib/stores/selection";
import { useEditsStore } from "@/lib/stores/edits";

import SubmitOtp from "@/ui/verification/SubmitOtp";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Profile,
  EnrichedProfileLink,
  ProfileTrustWarning,
} from "@/lib/profile/types";

type Variant = "default" | "mobile" | "compact";
type LinkVariant = "default" | "simple";

const formatUsername = (value = "") => value.trim().replace(/\s+/g, "_");

const resolveIconSrc = (icon?: EnrichedProfileLink["icon"]) =>
  (typeof icon === "string" ? icon : icon?.src) ||
  (typeof FALLBACK_ICON === "string" ? FALLBACK_ICON : FALLBACK_ICON?.src) ||
  "";

interface LinkRowClasses {
  row: string;
  left: string;
  leftLink: string;
  right: string;
  icon: string;
  label: string;
  domain: string;
  copySize?: "xs" | "sm" | "md";
  copyWrapper?: string;
}

interface ProfileLinkRowProps {
  link: EnrichedProfileLink;
  classes: LinkRowClasses;
  hideBadge?: boolean;
  badgeLabels?: { verified: string; unverified: string };
  badgeOnClick?: (event: React.MouseEvent, link: EnrichedProfileLink) => void;
  stopPropagation?: boolean;
}

function ProfileLinkRow({
  link,
  classes,
  hideBadge = false,
  badgeLabels = { verified: "Authenticated", unverified: "Not Authenticated" },
  badgeOnClick,
  stopPropagation = false,
}: ProfileLinkRowProps) {
  const isDiscord = isDiscordLink(link.url || "");
  const canLinkLeft = !(isDiscord && !link.is_verified);
  const handleLinkClick = stopPropagation ? (event: React.MouseEvent) => event.stopPropagation() : undefined;
  const badgeClick =
    badgeOnClick && !link.is_verified ? (event: React.MouseEvent) => badgeOnClick(event, link) : undefined;
  const copyProps = { label: "Copy", copiedLabel: "Copied", size: classes.copySize };
  const icon = (
    <img
      src={resolveIconSrc(link.icon)}
      alt=""
      className={classes.icon}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
  const leftContent = (
    <>
      {icon}
      <span className={classes.label}>{link.label}</span>
    </>
  );
  const copy = (text: string) => (
    <div className={classes.copyWrapper}>
      <CopyButton text={text} {...copyProps} />
    </div>
  );

  return (
    <div className={classes.row}>
      <div className={classes.left}>
        {canLinkLeft ? (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className={classes.leftLink}
          >
            {leftContent}
          </a>
        ) : (
          leftContent
        )}
        {!hideBadge && (
          <VerifiedBadge
            verified={link.is_verified}
            verifiedLabel={badgeLabels.verified}
            unverifiedLabel={badgeLabels.unverified}
            onClick={badgeClick}
          />
        )}
      </div>
      <div className={classes.right}>
        {isDiscord && !link.is_verified ? (
          <>
            <span className={classes.domain}>{link.label}</span>
            {copy(link.label || "")}
          </>
        ) : (
          <>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className={`${classes.domain} hover:text-blue-600 transition-colors`}
            >
              {extractDomain(link.url || "")}
            </a>
            {copy(link.url || "")}
          </>
        )}
      </div>
    </div>
  );
}

interface ProfileCardContentProps {
  profile: Profile;
  linksArray?: EnrichedProfileLink[];
  variant?: Variant;
  showLinks?: boolean;
  showAddress?: boolean;
  showBio?: boolean;
  showDates?: boolean;
  showQRButton?: boolean;
  onQRClick?: () => void;
  linkVariant?: LinkVariant;
  hideLinkBadges?: boolean;
  className?: string;
}

export function ProfileCardContent({
  profile,
  linksArray = [],
  variant = "default",
  showLinks = true,
  showAddress = true,
  showBio = true,
  showDates = true,
  showQRButton = false,
  onQRClick,
  linkVariant = "default",
  hideLinkBadges = false,
  className = "",
}: ProfileCardContentProps) {
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;

  const sizes = {
    mobile: {
      name: "text-lg",
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
      name: "text-xl",
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
      linkRowGap: "gap-2",
      linkRowPadding: "py-0.5",
    },
  };

  const s = sizes[variant] || sizes.default;
  const badgeLabels = {
    verified: linkVariant === "simple" ? "Auth" : "Authenticated",
    unverified: linkVariant === "simple" ? "Not Auth" : "Not Authenticated",
  };
  const linkRowClasses: LinkRowClasses = {
    row: `flex items-center ${s.linkRowGap} ${s.linkRowPadding} border-b border-gray-100 last:border-0 min-w-0 flex-shrink-0`,
    left: `flex items-center ${s.linkGap} shrink-0 min-w-0`,
    leftLink: `flex items-center ${s.linkGap} shrink-0 hover:text-blue-600 transition-colors min-w-0`,
    right: `flex items-center ${s.linkGap} ml-auto min-w-0 text-gray-600 justify-end flex-1`,
    icon: `${s.linkIcon} rounded-xs opacity-80 flex-shrink-0`,
    label: `font-medium ${s.linkLabel} text-gray-800 truncate`,
    domain: `flex-1 min-w-0 truncate text-right ${s.linkDomain}`,
    copySize: "xs",
  };

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Display Name */}
      <div className={`relative z-10 flex items-center justify-center gap-1.5`}>
        <span className={`${s.name} font-bold text-gray-900 truncate max-w-full`}>
          {profile.display_name || profile.name}
        </span>
        {isVerified && (
          <span className="flex-shrink-0 scale-[0.6] origin-center">
            <VerifiedBadge verified={true} />
          </span>
        )}
      </div>

      {/* Username */}
      <p className={`mt-1 ${s.username} text-gray-600 relative z-10`}>/{formatUsername(profile.name)}</p>

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
            {new Date(profile.joined_at || profile.created_at || profile.since || new Date().toISOString()).toLocaleString("default", {
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="opacity-70 transition-opacity duration-300" aria-hidden="true">•</span>
          <span className="whitespace-nowrap">
            Verified {getLastVerifiedLabel(profile.last_verified_at || profile.last_verified)}
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
                <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" size={variant === "mobile" ? "sm" : variant === "compact" ? "md" : "sm"} />
              </div>
            ) : (
              <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" size={variant === "mobile" ? "sm" : variant === "compact" ? "md" : "sm"} />
            )}
          </div>
        </div>
      )}

      {/* Links */}
      {showLinks && linksArray && linksArray.length > 0 && (
        <div className={`mt-5 flex-1 min-h-0 w-full relative z-10 flex flex-col flex-grow`}>
          <div className="rounded-2xl border border-gray-300 bg-gray-50/50 shadow-inner transition-all overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className={`${s.linkPadding} flex flex-col ${s.linkGap} flex-1 min-h-0 overflow-y-auto`}>
              {linksArray.slice(0, 3).map((link, i) => (
                <ProfileLinkRow
                  key={link.id || i}
                  link={link}
                  classes={linkRowClasses}
                  hideBadge={hideLinkBadges}
                  badgeLabels={badgeLabels}
                  stopPropagation
                />
              ))}
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
      <div className={`mt-auto pt-3 pb-2 flex items-center justify-center`}>
        <span className={`${variant === "mobile" ? "text-[7px]" : "text-[8px]"} text-green-800 bg-green-100 border border-green-300 rounded px-2 py-0.5 font-semibold shadow-xs flex items-center gap-1`}>
          View Profile
          <svg
            className={`${variant === "mobile" ? "w-2 h-2" : "w-2.5 h-2.5"} text-green-600`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

interface RedirectModalProps {
  isOpen: boolean;
  label: string;
}

function RedirectModal({ isOpen, label }: RedirectModalProps) {
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


interface ProfileCardProps {
  profile: Profile;
  onSelect?: (profile: Profile) => void; // eslint-disable-line no-unused-vars
  warning?: ProfileTrustWarning | null;
  fullView?: boolean;
  duplicateNameCount?: number;
}

export default function ProfileCard({
  profile,
  onSelect,
  warning,
  fullView = false,
  duplicateNameCount = 0
}: ProfileCardProps) {
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);
  const [authLink, setAuthLink] = useState<EnrichedProfileLink | null>(null);
  const [authRedirectOpen, setAuthRedirectOpen] = useState(false);
  const [authRedirectLabel, setAuthRedirectLabel] = useState("X.com");
  const [showStats, setShowStats] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { setForceShowQR } = useSelectionStore();
  const { pendingEdits, addLinkAuthToken } = useEditsStore();
  const { showBack, setShowBack, setMode, setVerify } = useMessagingStore();
  const { linksArray } = useProfileLinks({ profile });

  const { verifiedAddress, verifiedLinks, canAuthenticateLinks } = getProfileTrust(profile);
  const selectedAuthProvider = authLink ? getAuthProviderForUrl(authLink.url) : null;
  const authToken = authLink ? getLinkAuthToken(authLink) : null;
  const authPending = authToken && isLinkAuthPending(pendingEdits, authToken);
  const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);
  const hasDuplicateNames = duplicateNameCount > 1;
  const warningConfig = getWarningConfig({ profile, warning: !!warning, verifiedAddress, verifiedLinks, totalLinks, hasDuplicateNames });
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

  useEffect(() => {
    if (!warningConfig) return;
    setShowDetail(!!warningConfig.defaultExpanded);
  }, [warningConfig?.summary, warningConfig?.toggleLabel, warningConfig?.tone, warningConfig?.defaultExpanded]);

  const handleAuthBadgeClick = (event: React.MouseEvent, link: EnrichedProfileLink) => {
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
              <span className="truncate">{profile.display_name || profile.name}</span>
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
              /{formatUsername(profile.name)}
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
    <VerifiedCardWrapper
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
      featured={!!profile.featured}
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
          pointerEvents: "auto",
        }}
      >

        {/* FRONT SIDE */}
        <div
          className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full`}
          style={{ pointerEvents: "auto" }}
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
                      setVerify((prev) => ({
                        ...prev,
                        zId: profile.id ?? null,
                        requestId: null,
                      }));
                      setMode("verification");
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
              onClick={async () => {
                const shareUrl = buildShareUrl(profile);

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `${profile.display_name || profile.name} on Zcash.me`,
                      text: "Check out this Zcash profile:",
                      url: shareUrl,
                    });
                  } catch {
                    // User cancelled
                  }
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
          />

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
              {profile.display_name || profile.name}
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                />
              )}
            </h2>
            <div className="text-base font-medium text-gray-500 mt-1">
              /{formatUsername(profile.name)}
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
                    onClick={() => {
                      if (typeof setForceShowQR === "function") {
                        setForceShowQR(true);
                      }

                      setTimeout(() => {
                        const el = document.getElementById("zcash-feedback");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 200);
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
                    <div key={`${warningConfig.tone}-${index}`}>{line}</div>
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
          style={{ pointerEvents: showBack ? "auto" : "none" }}
        >
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => {
                (window as any).skipZcashFeedbackScroll = true;
                setShowBack(false);
                setMode("memo");
                if (setForceShowQR) {
                  setForceShowQR(false);
                }
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
  );
}
