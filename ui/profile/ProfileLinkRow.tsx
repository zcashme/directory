"use client";

import type { MouseEvent } from "react";
import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import { extractDomain, isDiscordLink } from "@/lib/profile/profileLinks";
import type { ProfileLinkRowProps } from "./profileCardTypes";
import { resolveIconSrc } from "./profileCardUtils";

export default function ProfileLinkRow({
  link,
  classes,
  hideBadge = false,
  badgeLabels = { verified: "Authenticated", unverified: "Not Authenticated" },
  badgeOnClick,
  stopPropagation = false,
}: ProfileLinkRowProps) {
  const isDiscord = isDiscordLink(link.url || "");
  const canLinkLeft = !(isDiscord && !link.is_verified);
  const handleLinkClick = stopPropagation ? (event: MouseEvent) => event.stopPropagation() : undefined;
  const badgeClick =
    badgeOnClick && !link.is_verified ? (event: MouseEvent) => badgeOnClick(event, link) : undefined;
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
