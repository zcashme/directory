import { useEffect, useState } from "react";
import type { MouseEventHandler } from "react";

interface VerifiedBadgeProps {
  verified?: boolean;
  variant?: "verified" | "maxi" | "zcashName";
  collapsedOnly?: boolean;
  verifiedLabel?: string;
  unverifiedLabel?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  href?: string;
}

export default function VerifiedBadge({
  verified = true,
  variant = "verified",
  collapsedOnly = false,
  verifiedLabel,
  unverifiedLabel = "Unverified",
  onClick,
  href,
}: VerifiedBadgeProps) {
  // Always start closed; open only via hover or click when allowed.
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (open && !collapsedOnly) {
      timer = setTimeout(() => setOpen(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [collapsedOnly, open]);

  const baseClasses =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none whitespace-nowrap align-middle";

  const renderCheckmark = (color: string) => (
    <span className="relative flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-3.5 w-3.5 ${color} drop-shadow-xs`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
      </svg>
    </span>
  );

  const renderStar = (color: string) => (
    <span className="relative flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-3.5 w-3.5 ${color} drop-shadow-xs`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.049 2.927a1 1 0 011.902 0l1.197 3.688a1 1 0 00.95.69h3.878a1 1 0 01.588 1.809l-3.138 2.28a1 1 0 00-.364 1.118l1.198 3.688a1 1 0 01-1.539 1.118l-3.138-2.28a1 1 0 00-1.176 0l-3.138 2.28a1 1 0 01-1.539-1.118l1.198-3.688a1 1 0 00-.364-1.118L2.436 9.114a1 1 0 01.588-1.809h3.878a1 1 0 00.95-.69l1.197-3.688z" />
      </svg>
    </span>
  );

  const renderZcashSymbol = (color: string) => (
    <span className="relative flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-3.5 w-3.5 ${color} drop-shadow-xs`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        style={{ transform: "scaleX(-1) rotate(90deg)", transformOrigin: "50% 50%" }}
      >
        <path d="M4 4.6h12v2H7.2l8.8 6.6v2.2H4v-2h8.8L4 6.8V4.6z" />
        <path d="M9.2 2.5h1.6v3H9.2zm0 12h1.6v3H9.2z" />
      </svg>
    </span>
  );

  const resolvedVerifiedLabel = verifiedLabel ?? (
    variant === "maxi" ? "Maxi Mode" : variant === "zcashName" ? "Zcash Name" : "Verified"
  );
  const verifiedLabelHoverMax =
    resolvedVerifiedLabel.length > 9
      ? "group-hover/badge:max-w-[120px]"
      : "group-hover/badge:max-w-[70px]";
  const verifiedLabelMax =
    resolvedVerifiedLabel.length > 9 ? "max-w-[120px]" : "max-w-[70px]";
  const unverifiedLabelHoverMax =
    unverifiedLabel.length > 11
      ? "group-hover/badge:max-w-[140px]"
      : "group-hover/badge:max-w-[80px]";
  const unverifiedLabelMax =
    unverifiedLabel.length > 11 ? "max-w-[140px]" : "max-w-[80px]";
  const isExpanded = !collapsedOnly && (open || hovered);

  const handleBadgeClick: MouseEventHandler<HTMLSpanElement> = (event) => {
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
  };

  if (verified) {
    const gapClasses = collapsedOnly
      ? "gap-0"
      : "gap-0 group-hover/badge:gap-1 transition-[gap] duration-300";
    const verifiedRevealClasses = collapsedOnly
      ? "max-w-0 opacity-0"
      : open
        ? `${verifiedLabelMax} opacity-100`
        : `max-w-0 opacity-0 ${verifiedLabelHoverMax} group-hover/badge:opacity-100`;
    const verifiedClasses = variant === "maxi" || variant === "zcashName"
      ? `text-amber-900 bg-linear-to-r from-amber-100 to-yellow-200 border-amber-300 shadow-xs px-[0.2rem] py-[0.1rem] ${collapsedOnly ? "" : "hover:px-[0.5rem]"}`
      : `text-green-800 bg-linear-to-r from-green-100 to-green-200 border-green-300 shadow-xs px-[0.2rem] py-[0.1rem] ${collapsedOnly ? "" : "hover:px-[0.5rem]"}`;
    return (
    <span
      onClick={handleBadgeClick}
      onMouseEnter={() => !collapsedOnly && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={resolvedVerifiedLabel}
      className={`${baseClasses} group/badge inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
      ${verifiedClasses}${onClick || href ? " cursor-pointer" : ""}`}
      style={{ fontFamily: "inherit" }}
    >
        <div className={`flex items-center justify-center ${gapClasses}`}>

          {variant === "maxi"
            ? renderStar("text-amber-900")
            : variant === "zcashName"
              ? renderZcashSymbol("text-amber-900")
              : renderCheckmark("text-green-600")}

          <span
            className={`
    overflow-hidden inline-block ease-in-out whitespace-nowrap
    transition-all duration-300
    ${verifiedRevealClasses}
  `}
          >
            {resolvedVerifiedLabel}
          </span>

        </div>
      </span>
    );
  }

  // Unverified unchanged
  return (
    <span
      onClick={handleBadgeClick}
      onMouseEnter={() => !collapsedOnly && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={unverifiedLabel}
      className={`${baseClasses} leading-none group/badge inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
      text-gray-600 bg-gray-100 border-gray-300 shadow-xs px-[0.2rem] py-[0.1rem]${collapsedOnly ? "" : " hover:px-[0.5rem]"}${onClick || href ? " cursor-pointer" : ""}`}
      style={{ fontFamily: "inherit" }}
    >
      <div className={`flex items-center justify-center ${collapsedOnly ? "gap-0" : "gap-0 group-hover/badge:gap-1 transition-[gap] duration-300"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z" />
        </svg>
        <span
          className={`
            overflow-hidden inline-block ease-in-out whitespace-nowrap
            ${hasMounted ? "transition-all duration-300" : ""}
            ${collapsedOnly
              ? "max-w-0 opacity-0"
              : open
                ? `${unverifiedLabelMax} opacity-100`
                : `max-w-0 opacity-0 ${unverifiedLabelHoverMax} group-hover/badge:opacity-100`
            }
          `}
        >
          {unverifiedLabel}
        </span>
      </div>
    </span>
  );
}
