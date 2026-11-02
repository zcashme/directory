"use client";

import { useId, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import CopyButton from "@/ui/common/buttons/CopyButton";
import Button from "@/ui/common/buttons/Button";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import { extractDomain } from "@/lib/profile/profileLinks";
import { getLinkAuthenticatedLabel } from "@/lib/profile/profileUtils";
import { detectProviderFromUrl, isDomainUrl } from "@/ui/links/providers";
import type { ProfileLinkRowProps } from "./profileCardTypes";
import { resolveIconSrc } from "./profileCardUtils";

export default function ProfileLinkRow({
  link,
  classes,
  hideBadge = false,
  badgeLabels = { verified: "Authenticated", unverified: "Not Authenticated" },
  stopPropagation = false,
  onVerifyClick,
  expanded = false,
  onToggleAuthDetails,
}: ProfileLinkRowProps) {
  const detailsId = useId();
  const shouldReduceMotion = useReducedMotion();
  const isDiscord = link.platform === "Discord";
  const hasPersistedId = Number.isSafeInteger(link.id) && Number(link.id) > 0;
  const canVerify =
    hasPersistedId &&
    !link.is_verified &&
    (!!detectProviderFromUrl(link.url || "") || isDomainUrl(link.url || ""));
  const canLinkLeft = !(isDiscord && !link.is_verified);
  const showAuthDetails = !hideBadge && !!onToggleAuthDetails;
  const handleLinkClick = stopPropagation ? (event: MouseEvent) => event.stopPropagation() : undefined;
  const copyProps = { label: "Copy", copiedLabel: "Copied", size: classes.copySize };
  const dur = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";
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

  const handleBadgeClick = onToggleAuthDetails
    ? (event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleAuthDetails();
      }
    : canVerify && onVerifyClick
      ? () => onVerifyClick(link)
      : undefined;

  const warningText = isDiscord
    ? "This username is not authenticated. It may not belong to the person you are expecting."
    : "This link is not authenticated. It may not belong to the person you are expecting.";

  return (
    <div className={classes.section ?? "border-b border-gray-100 last:border-0 min-w-0"}>
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
              onClick={handleBadgeClick}
              expanded={showAuthDetails ? expanded : undefined}
              detailsId={showAuthDetails ? detailsId : undefined}
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
                className={`${classes.domain} hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] transition-colors`}
                style={classes.domainStyle}
              >
                {extractDomain(link.url || "")}
              </a>
              {copy(link.url || "")}
            </>
          )}
        </div>
      </div>
      {showAuthDetails ? (
        <div
          id={detailsId}
          aria-hidden={!expanded}
          inert={!expanded ? true : undefined}
          className={`grid transition-[grid-template-rows,opacity,margin] ${dur} ${
            expanded ? "grid-rows-[1fr] opacity-100 mt-1 mb-1" : "grid-rows-[0fr] opacity-0 mt-0 mb-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            {link.is_verified ? (
              <p className="px-0.5 text-[11px] leading-snug text-green-800">
                {getLinkAuthenticatedLabel(link.verified_at)}
              </p>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-[11px] leading-snug text-yellow-900">
                <p>{warningText}</p>
                {canVerify && onVerifyClick ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    className="mt-1.5"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onVerifyClick(link);
                    }}
                  >
                    Authenticate
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
