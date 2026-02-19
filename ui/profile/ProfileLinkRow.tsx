"use client";

import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import { extractDomain, isDiscordLink } from "@/lib/profile/profileLinks";
import { detectProviderFromUrl } from "@/ui/links/providers";
import type { ProfileLinkRowProps } from "./profileCardTypes";
import { resolveIconSrc } from "./profileCardUtils";

export default function ProfileLinkRow({
  link,
  classes,
  hideBadge = false,
  badgeLabels = { verified: "Authenticated", unverified: "Not Authenticated" },
  stopPropagation = false,
  onVerifyClick,
}: ProfileLinkRowProps) {
  const isDiscord = isDiscordLink(link.url || "");
  const canVerify = !link.is_verified && !!detectProviderFromUrl(link.url || "");
  const canLinkLeft = !(isDiscord && !link.is_verified);
  const handleLinkClick = stopPropagation ? (event: React.MouseEvent) => event.stopPropagation() : undefined;
  const copyProps = { label: "Copy", copiedLabel: "Copied", size: classes.copySize };
  const icon = (
    <img
      src={resolveIconSrc(link.icon)}
      alt=""
      className={classes.icon}
      style={classes.iconStyle}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
  const leftContent = (
    <>
      {icon}
      <span className={classes.label} style={classes.labelStyle}>{link.label}</span>
    </>
  );
  const copy = (text: string) => (
    <div
      className={classes.copyWrapper}
      style={classes.copyScale ? { transform: `scale(${classes.copyScale})`, transformOrigin: "center right" } : undefined}
    >
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
            onClick={canVerify && onVerifyClick ? () => onVerifyClick(link) : undefined}
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
              style={classes.domainStyle}
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
