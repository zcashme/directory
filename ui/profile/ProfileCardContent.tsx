"use client";

import { getLastVerifiedLabel } from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileLinkRow from "./ProfileLinkRow";
import type { ProfileCardContentProps, LinkRowClasses } from "./profileCardTypes";
import { formatUsername } from "./profileCardUtils";

export default function ProfileCardContent({
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
  textScaleOverrides,
  showDisplayNameVerifiedBadge = true,
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
  const scale = {
    displayName: textScaleOverrides?.displayName ?? 1,
    verifiedBadge: textScaleOverrides?.verifiedBadge ?? 1,
    username: textScaleOverrides?.username ?? 1,
    bio: textScaleOverrides?.bio ?? 1,
    meta: textScaleOverrides?.meta ?? 1,
    address: textScaleOverrides?.address ?? 1,
    addressCopy: textScaleOverrides?.addressCopy ?? 1,
    linkIcon: textScaleOverrides?.linkIcon ?? 1,
    linkLabel: textScaleOverrides?.linkLabel ?? 1,
    linkDomain: textScaleOverrides?.linkDomain ?? 1,
    linkMore: textScaleOverrides?.linkMore ?? 1,
    linkCopy: textScaleOverrides?.linkCopy ?? 1,
    viewProfile: textScaleOverrides?.viewProfile ?? 1,
  };
  const basePx = variant === "mobile"
    ? {
        displayName: 18,
        verifiedBadge: 16,
        username: 9,
        bio: 8,
        meta: 8,
        address: 8,
        viewProfile: 7,
        linkLabel: 8,
        linkDomain: 7,
        linkMore: 7,
      }
    : {
        displayName: 20,
        verifiedBadge: 16,
        username: 10,
        bio: 9,
        meta: 9,
        address: 9,
        viewProfile: 8,
        linkLabel: 9,
        linkDomain: 8,
        linkMore: 8,
      };
  const badgeLabels = {
    verified: linkVariant === "simple" ? "Auth" : "Authenticated",
    unverified: linkVariant === "simple" ? "Not Auth" : "Not Authenticated",
  };
  const copyButtonSize = "xs";
  const linkRowClasses: LinkRowClasses = {
    row: `flex items-center ${s.linkRowGap} ${s.linkRowPadding} border-b border-gray-100 last:border-0 min-w-0 flex-shrink-0`,
    left: `flex items-center ${s.linkGap} shrink-0 min-w-0 pl-0.5`,
    leftLink: `flex items-center ${s.linkGap} shrink-0 hover:text-[var(--color-brand-blue)] transition-colors min-w-0`,
    right: `flex items-center ${s.linkGap} ml-auto min-w-0 text-gray-600 justify-end flex-1`,
    icon: `${s.linkIcon} rounded-xs opacity-80 flex-shrink-0`,
    iconStyle: { transform: `scale(${scale.linkIcon})`, transformOrigin: "center center" },
    label: `font-medium ${s.linkLabel} text-gray-800 truncate pl-0.5`,
    labelStyle: { fontSize: `${(basePx.linkLabel * scale.linkLabel).toFixed(1)}px` },
    domain: `flex-1 min-w-0 truncate text-right ${s.linkDomain}`,
    domainStyle: { fontSize: `${(basePx.linkDomain * scale.linkDomain).toFixed(1)}px` },
    copySize: copyButtonSize,
    copyScale: scale.linkCopy,
  };

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Display Name */}
      <div className={`relative z-10 flex items-center justify-center gap-1.5`}>
        <span
          className={`${s.name} font-bold text-gray-900 truncate max-w-full`}
          style={{ fontSize: `${(basePx.displayName * scale.displayName).toFixed(1)}px` }}
        >
          {profile.display_name || profile.name}
        </span>
        {isVerified && showDisplayNameVerifiedBadge && (
          <span
            className="flex-shrink-0 origin-center"
            style={{ transform: `scale(${0.6 * scale.verifiedBadge})` }}
          >
            <VerifiedBadge verified={true} />
          </span>
        )}
      </div>

      {/* Username */}
      <p
        className={`mt-1 ${s.username} text-gray-600 relative z-10`}
        style={{ fontSize: `${(basePx.username * scale.username).toFixed(1)}px` }}
      >
        /{formatUsername(profile)}
      </p>

      {/* Bio */}
      {showBio && profile.bio && profile.bio.trim() !== "" && (
        <p
          className={`mt-1 ${s.bio} text-gray-700 line-clamp-2 leading-relaxed px-1 relative z-10 break-words`}
          style={{ fontSize: `${(basePx.bio * scale.bio).toFixed(1)}px` }}
        >
          {profile.bio}
        </p>
      )}

      {/* Dates */}
      {showDates && (
        <p
          className={`mt-3 ${s.dates} text-gray-500 flex flex-wrap justify-center gap-x-1 gap-y-0.5 relative z-10`}
          style={{ fontSize: `${(basePx.meta * scale.meta).toFixed(1)}px` }}
        >
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
          <div
            className={`relative overflow-hidden flex items-center gap-2 border text-gray-700 font-mono ${s.address} rounded-full ${s.addressPadding} shadow-inner w-fit max-w-[90%] border-gray-300 bg-white/80`}
            style={{ fontSize: `${(basePx.address * scale.address).toFixed(1)}px` }}
          >
            <span className="pointer-events-none absolute left-[6%] right-[6%] top-0 h-[5px] rounded-full bg-linear-to-b from-gray-200/55 to-transparent" aria-hidden />
            <span className="select-all pl-0.5" title={profile.address}>
              {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
            </span>
            {showQRButton && onQRClick ? (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <button
                  onClick={onQRClick}
                  className="group flex items-center justify-center text-gray-500 hover:text-[var(--color-brand-blue)] transition-all px-1 overflow-hidden"
                  title="Show QR"
                >
                  ▣
                  <span className="inline-block max-w-0 group-hover:max-w-[60px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">
                    QR
                  </span>
                </button>
                <div
                  className="inline-flex items-center justify-center"
                  style={{ transform: `scale(${scale.addressCopy})`, transformOrigin: "center right" }}
                >
                  <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" size={copyButtonSize} />
                </div>
              </div>
            ) : (
              <div
                className="inline-flex items-center justify-center"
                style={{ transform: `scale(${scale.addressCopy})`, transformOrigin: "center right" }}
              >
                <CopyButton text={profile.address} label="Copy" copiedLabel="Copied" size={copyButtonSize} />
              </div>
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
                <span
                  className={`${s.linkDomain} text-gray-500 text-center pt-1`}
                  style={{ fontSize: `${(basePx.linkMore * scale.linkMore).toFixed(1)}px` }}
                >
                  +{linksArray.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Profile Footer - Fixed at bottom */}
      <div className={`mt-auto pt-5 pb-2 flex items-center justify-center`}>
        <span
          className={`${variant === "mobile" ? "text-[7px]" : "text-[8px]"} relative overflow-hidden -translate-y-[1px] text-green-800 bg-green-100 border border-green-300 rounded px-2 py-0.5 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_2px_4px_rgba(0,0,0,0.12)] flex items-center gap-1`}
          style={{ fontSize: `${(basePx.viewProfile * scale.viewProfile).toFixed(1)}px` }}
        >
          View Profile
          <svg
            className={`${variant === "mobile" ? "w-2 h-2" : "w-2.5 h-2.5"} text-green-600`}
            style={{ transform: `scale(${scale.viewProfile})`, transformOrigin: "center center" }}
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
