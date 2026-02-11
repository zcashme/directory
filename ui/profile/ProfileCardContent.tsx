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
