"use client";
import React from "react";
import type { StaticImageData } from "next/image";
import type { EnrichedLink } from "./useNsDirectory";
import type { UnverifiedLinkData } from "./types";
import { FALLBACK_ICON, getLinkLabel, getSocialDisplay, getSocialHandle } from "@/lib/profile/profileLinks";

interface SocialLinksProps {
  links?: EnrichedLink[];
  onUnverifiedClick?: (_data: UnverifiedLinkData) => void;
  stopPropagation?: boolean;
  className?: string;
  linkClassName?: string;
  prependLink?: {
    href: string;
    label: string;
    title: string;
    iconSrc: string;
  };
}

function resolveImageSrc(icon: StaticImageData | string | undefined): string | undefined {
  if (!icon) return undefined;
  if (typeof icon === "string") return icon;
  return icon.src;
}

export default function SocialLinks({
  links = [],
  onUnverifiedClick,
  stopPropagation = false,
  className = "mt-2 flex flex-wrap content-start gap-2",
  linkClassName = "flex h-7 items-center gap-2 border border-gray-900 bg-white px-2 text-[10px] font-semibold uppercase transition-transform duration-150 hover:scale-[1.05] rounded-none",
  prependLink,
}: SocialLinksProps) {
  if (!links.length && !prependLink) return null;

  const handleStop = stopPropagation
    ? (event: React.MouseEvent) => event.stopPropagation()
    : undefined;

  return (
    <div className={className}>
      {prependLink ? (
        <a
          href={prependLink.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleStop}
          className={linkClassName}
          title={prependLink.title}
        >
          <img
            src={prependLink.iconSrc}
            alt={prependLink.title}
            className="h-4 w-4"
          />
          <span className="max-w-[140px] truncate">{prependLink.label}</span>
        </a>
      ) : null}
      {links.map((link) => {
        const isDiscord = link.platform === "Discord";
        const isVerified = Boolean(link.is_verified);
        const displayHandle = getSocialDisplay(link);
        const title = link.domainLabel ?? getLinkLabel(link.url);

        if (!isVerified) {
          return (
            <button
              key={link.id ?? link.url}
              type="button"
              onClick={(event) => {
                if (stopPropagation) event.stopPropagation();
                onUnverifiedClick?.({
                  url: link.url,
                  label: link.label ?? "",
                  display: getSocialHandle(link.url, link.platform),
                  isDiscord,
                });
              }}
              className={linkClassName}
              title={title}
            >
              <img
                src={resolveImageSrc(link.icon) ?? resolveImageSrc(FALLBACK_ICON)}
                alt={title}
                className="h-4 w-4"
              />
              <span className="flex max-w-[140px] items-end gap-1 truncate">
                <span className="truncate">{displayHandle}</span>
                <span className="-translate-y-[1px]" aria-label="Unverified">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-red-600 drop-shadow-xs"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </span>
            </button>
          );
        }

        return (
            <a
              key={link.id ?? link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleStop}
            className={linkClassName}
            title={title}
          >
            <img
              src={resolveImageSrc(link.icon) ?? resolveImageSrc(FALLBACK_ICON)}
              alt={title}
              className="h-4 w-4"
            />
            <span className="flex max-w-[140px] items-end gap-1 truncate">
              <span className="truncate">{displayHandle}</span>
              <span className="-translate-y-[1px]" aria-label="Verified">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-green-600 drop-shadow-xs"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
                </svg>
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
