"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MouseEventHandler } from "react";

interface NetworkSchoolBadgeProps {
  collapsedOnly?: boolean;
  label?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  href?: string;
}

export default function NetworkSchoolBadge({
  collapsedOnly = false,
  label = "Network State",
  onClick,
  href,
}: NetworkSchoolBadgeProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (open && !collapsedOnly) {
      timer = setTimeout(() => setOpen(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [collapsedOnly, open]);

  const labelHoverMax = label.length > 11
    ? "group-hover/badge:max-w-[140px]"
    : "group-hover/badge:max-w-[110px]";
  const labelMax = label.length > 11 ? "max-w-[140px]" : "max-w-[110px]";
  const revealClasses = collapsedOnly
    ? "max-w-0 opacity-0"
    : open
      ? `${labelMax} opacity-100`
      : `max-w-0 opacity-0 ${labelHoverMax} group-hover/badge:opacity-100`;
  const isExpanded = !collapsedOnly && (open || hovered);
  const outerPaddingClasses = collapsedOnly ? "" : "hover:px-[0.5rem]";
  const gapClasses = collapsedOnly
    ? "gap-0"
    : "gap-0 transition-[gap] duration-300 group-hover/badge:gap-1";

  return (
    <span
      onClick={(event) => {
        if (href && !isExpanded) {
          event.preventDefault();
          setOpen(true);
        }
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!collapsedOnly) setOpen(true);
        if (href && typeof window !== "undefined") {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      }}
      onMouseEnter={() => !collapsedOnly && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      className={`group/badge inline-flex items-center justify-center gap-0 rounded-full border border-sky-300 bg-linear-to-r from-sky-100 to-cyan-200 px-[0.2rem] py-[0.1rem] text-xs font-medium text-sky-900 shadow-xs transition-all duration-300 select-none whitespace-nowrap align-middle ${outerPaddingClasses}${onClick || href ? " cursor-pointer" : ""}`}
      style={{ fontFamily: "inherit" }}
    >
      <span className={`flex items-center justify-center ${gapClasses}`}>
        <Image
          src="/assets/icons/ns_flag_badge.svg"
          alt=""
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          width={14}
          height={14}
        />
        <span
          className={`overflow-hidden inline-block whitespace-nowrap transition-all duration-300 ease-in-out ${revealClasses}`}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
