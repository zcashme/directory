import React, { useState, useEffect } from "react";

export default function VerifiedBadge({
  verified = true,
  compact = false,
}) {
  // Start expanded on first appearance
const [open, setOpen] = useState(true);

// Collapse automatically after initial reveal
useEffect(() => {
  const timer = setTimeout(() => setOpen(false), 700);
  return () => clearTimeout(timer);
}, []);

  // NEW: Prevent "start expanded then collapse"
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isTouchDevice && open) {
      timer = setTimeout(() => setOpen(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [open, isTouchDevice]);

  const baseClasses =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none whitespace-nowrap align-middle";

  // UNIVERSAL shield renderer
  const renderShield = (color) => (
    <span className="relative flex items-center">
      <span className={`h-3.5 w-3.5 ${color} drop-shadow-sm`}>⛉</span>
    </span>
  );

  if (verified) {
    return (
      <span
        onTouchStart={(e) => {
          e.stopPropagation();
          if (isTouchDevice) setOpen(true);
        }}
        className={`${baseClasses} group inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
        text-green-800 bg-gradient-to-r from-green-100 to-green-200 border-green-300 shadow-sm px-[0.2rem] hover:px-[0.5rem] py-[0.1rem]`}
        style={{ fontFamily: "inherit" }}
      >
        <div className="flex items-center justify-center gap-0 group-hover:gap-1 transition-[gap] duration-300">

          {renderShield("text-green-600")}

<span
  className={`
    overflow-hidden inline-block ease-in-out whitespace-nowrap
    transition-all duration-300
    ${
      // if open=true on mount, fake the exact same animation as hover
      open
        ? "group-hover:max-w-[70px] group-hover:opacity-100 max-w-[70px] opacity-100"
        : "max-w-0 opacity-0 group-hover:max-w-[70px] group-hover:opacity-100"
    }
  `}
>
  Verified
</span>

        </div>
      </span>
    );
  }

  // Unverified unchanged
  return (
    <span
      onTouchStart={(e) => {
        e.stopPropagation();
        if (isTouchDevice) setOpen(true);
      }}
className={`${baseClasses} leading-none group inline-flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-300
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
          className={`
            overflow-hidden inline-block ease-in-out whitespace-nowrap
            ${hasMounted ? "transition-all duration-300" : ""}
            ${
              open
                ? "max-w-[80px] opacity-100"
                : "max-w-0 opacity-0 group-hover:max-w-[80px] group-hover:opacity-100"
            }
          `}
        >
          Unverified
        </span>
      </div>
    </span>
  );
}
