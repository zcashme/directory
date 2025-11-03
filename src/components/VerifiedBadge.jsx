import React, { useState, useEffect } from "react";
import CheckIcon from "../assets/CheckIcon";

export default function VerifiedBadge({ verified = true, verifiedCount = 1 }) {
  const [open, setOpen] = useState(false);

  // Detect touch-capable devices
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Auto-close timeout handler
  useEffect(() => {
    let timer;
    if (isTouchDevice && open) {
      timer = setTimeout(() => setOpen(false), 2000); // Auto-collapse after 2s
    }
    return () => clearTimeout(timer);
  }, [open, isTouchDevice]);

  const baseClasses =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none whitespace-nowrap align-middle";

  const checksToShow = Math.min(Math.max(verifiedCount, 1), 3); // clamp between 1–3

  const renderChecks = (color) => (
    <span className="relative flex -space-x-1">
      {[...Array(checksToShow)].map((_, i) => (
        <CheckIcon
          key={i}
          className={`h-3.5 w-3.5 ${color} drop-shadow-sm`}
          style={{ zIndex: 3 - i }}
        />
      ))}
    </span>
  );

  if (verified) {
    // ✅ Verified or partially verified
    return (
      <span
        onTouchStart={(e) => {
          e.stopPropagation();
          if (isTouchDevice) {
            setOpen(true); // Open on tap
          }
        }}
        className={`${baseClasses} group inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
        text-green-800 bg-gradient-to-r from-green-100 to-green-200 border-green-300 shadow-sm px-[0.2rem] hover:px-[0.5rem] py-[0.1rem]`}
        style={{ fontFamily: "inherit" }}
      >
        <div className="flex items-center justify-center gap-0 group-hover:gap-1 transition-[gap] duration-300">
          {renderChecks("text-green-600")}
          <span
            className={`overflow-hidden inline-block transition-all duration-300 ease-in-out whitespace-nowrap ${
              open
                ? "max-w-[70px] opacity-100"
                : "max-w-0 opacity-0 group-hover:max-w-[70px] group-hover:opacity-100"
            }`}
          >
            Verified
          </span>
        </div>
      </span>
    );
  }

  // ⚪ Unverified state
  return (
    <span
      onTouchStart={(e) => {
        e.stopPropagation();
        if (isTouchDevice) {
          setOpen(true);
        }
      }}
      className={`${baseClasses} group inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
      text-gray-600 bg-gray-100 border-gray-300 shadow-sm px-[0.2rem] hover:px-[0.5rem] py-[0.1rem]`}
      style={{ fontFamily: "inherit" }}
    >
      <div className="flex items-center justify-center gap-0 group-hover:gap-1 transition-[gap] duration-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z" />
        </svg>
        <span
          className={`overflow-hidden inline-block transition-all duration-300 ease-in-out whitespace-nowrap ${
            open
              ? "max-w-[80px] opacity-100"
              : "max-w-0 opacity-0 group-hover:max-w-[80px] group-hover:opacity-100"
          }`}
        >
          Unverified
        </span>
      </div>
    </span>
  );
}
