import { useState, useEffect } from "react";
import type { MouseEventHandler } from "react";

interface VerifiedBadgeProps {
  verified?: boolean;
  verifiedLabel?: string;
  unverifiedLabel?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
}

export default function VerifiedBadge({
  verified = true,
  verifiedLabel = "Verified",
  unverifiedLabel = "Unverified",
  onClick,
}: VerifiedBadgeProps) {
  // Start collapsed by default
  const [open, setOpen] = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (open) {
      timer = setTimeout(() => setOpen(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [open]);

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

  const verifiedLabelMax =
    verifiedLabel.length > 9 ? "max-w-[120px]" : "max-w-[70px]";
  const verifiedLabelHoverMax =
    verifiedLabel.length > 9
      ? "group-hover/badge:max-w-[120px]"
      : "group-hover/badge:max-w-[70px]";
  const unverifiedLabelMax =
    unverifiedLabel.length > 11 ? "max-w-[140px]" : "max-w-[80px]";
  const unverifiedLabelHoverMax =
    unverifiedLabel.length > 11
      ? "group-hover/badge:max-w-[140px]"
      : "group-hover/badge:max-w-[80px]";

  if (verified) {
    return (
    <span
      onClick={onClick}
      onTouchStart={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      aria-label={verifiedLabel}
      className={`${baseClasses} group/badge inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
      text-green-800 bg-linear-to-r from-green-100 to-green-200 border-green-300 shadow-xs px-[0.2rem] hover:px-[0.5rem] py-[0.1rem]`}
      style={{ fontFamily: "inherit" }}
    >
        <div className="flex items-center justify-center gap-0 group-hover/badge:gap-1 transition-[gap] duration-300">

          {renderCheckmark("text-green-600")}

          <span
            className={`
    overflow-hidden inline-block ease-in-out whitespace-nowrap
    transition-all duration-300
    ${
              open
                ? `${verifiedLabelHoverMax} group-hover/badge:opacity-100 ${verifiedLabelMax} opacity-100`
                : `max-w-0 opacity-0 ${verifiedLabelHoverMax} group-hover/badge:opacity-100`
              }
  `}
          >
            {verifiedLabel}
          </span>

        </div>
      </span>
    );
  }

  // Unverified unchanged
  return (
    <span
      onClick={onClick}
      onTouchStart={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      aria-label={unverifiedLabel}
      className={`${baseClasses} leading-none group/badge inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
      text-gray-600 bg-gray-100 border-gray-300 shadow-xs px-[0.2rem] hover:px-[0.5rem] py-[0.1rem]`}
      style={{ fontFamily: "inherit" }}
    >
      <div className="flex items-center justify-center gap-0 group-hover/badge:gap-1 transition-[gap] duration-300">
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
            ${open
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
