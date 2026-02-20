"use client";

import { useState, useEffect, useRef } from "react";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import { motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";

interface ProfileCardActionsProps {
  profile: Profile;
  hasAwards: boolean;
  showStats: boolean;
  onToggleStats: () => void;
  onEdit: () => void;
  onVerify: () => void;
}

export default function ProfileCardActions({
  profile,
  hasAwards,
  showStats,
  onToggleStats,
  onEdit,
  onVerify,
}: ProfileCardActionsProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = profile.display_name || profile.name || "";
  const tapProps = shouldReduceMotion
    ? {}
    : { whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" }, transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 } };
  const dur = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  const menuItem = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={() => { onClick(); setMenuOpen(false); }}
      disabled={disabled}
      className={`w-full whitespace-nowrap text-left px-3 py-2 transition-colors ${disabled ? "text-gray-400 cursor-not-allowed opacity-60" : "hover:bg-[var(--color-brand-blue)]/10 text-gray-800"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Menu */}
      <div ref={menuRef} className="relative">
        <motion.button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
          aria-expanded={menuOpen}
          {...tapProps}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 transition-all"
          title="More options"
        >
          <span aria-hidden className={`inline-block transition-transform ${dur} ${menuOpen ? "rotate-90" : "rotate-0"}`}>{"\u2630"}</span>
        </motion.button>
        <div
          aria-hidden={!menuOpen}
          className={`absolute left-0 mt-2 inline-flex w-max flex-col items-stretch origin-top-left rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden z-50 text-sm text-gray-700 transition-all ${dur} ${menuOpen ? "max-h-64 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"}`}
        >
          {menuItem(showStats ? "⭔ Hide Awards" : "⭔ Show Awards", onToggleStats, !showStats && !hasAwards)}
          {menuItem("↺ Edit Profile", onEdit)}
          {menuItem("✓ Verify Profile", onVerify)}
        </div>
      </div>

      {/* Share */}
      <motion.button
        onClick={async () => {
          const url = buildShareUrl(profile);
          if (navigator.share) {
            try { await navigator.share({ title: `${displayName} on Zcash.me`, text: "Check out this Zcash profile:", url }); return; } catch {}
          }
          await navigator.clipboard.writeText(url);
          alert("Profile link copied to clipboard!");
        }}
        {...tapProps}
        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 transition-all"
        title={`Share ${displayName}`}
      >
        <img src="/assets/icons/share.svg" alt="Share" className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity" aria-hidden />
      </motion.button>
    </>
  );
}
