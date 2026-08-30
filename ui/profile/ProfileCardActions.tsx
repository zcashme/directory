"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { buildShareUrl } from "@/lib/profile/profileUtils";
import { motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";

interface ProfileCardActionsProps {
  profile: Profile;
  hasAwards: boolean;
  showStats: boolean;
  onToggleStats: () => void;
  onEdit: () => void;
  onCreatePrefillUrl: () => void;
  onUpgrade: () => void;
}

export default function ProfileCardActions({
  profile,
  hasAwards,
  showStats,
  onToggleStats,
  onEdit,
  onCreatePrefillUrl,
  onUpgrade,
}: ProfileCardActionsProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = profile.display_name || profile.name || "";
  const referDisplayName = (profile.display_name || profile.name || "a friend").trim();
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
      };
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

  const menuItem = (icon: ReactNode, label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={() => {
        onClick();
        setMenuOpen(false);
      }}
      disabled={disabled}
      className={`w-full whitespace-nowrap text-left px-3 py-2 transition-colors ${
        disabled
          ? "text-gray-400 cursor-not-allowed opacity-60"
          : "hover:bg-[var(--color-brand-blue)]/10 text-gray-800"
      }`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="inline-flex w-4 shrink-0 justify-center overflow-visible">
          {icon}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );

  return (
    <>
      {/* Menu */}
      <div ref={menuRef} className="relative">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((p) => !p);
          }}
          aria-expanded={menuOpen}
          {...tapProps}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] hover:border-[var(--color-brand-blue)] hover:border-[var(--profile-hover-color)] hover:bg-[var(--color-brand-blue)]/10 hover:bg-[var(--profile-hover-bg)] transition-all"
          title="More options"
        >
          <span
            aria-hidden
            className={`inline-block transition-transform ${dur} ${
              menuOpen ? "rotate-90" : "rotate-0"
            }`}
          >
            {"\u2630"}
          </span>
        </motion.button>
        <div
          aria-hidden={!menuOpen}
          className={`absolute left-0 mt-2 inline-flex w-max flex-col items-stretch origin-top-left rounded-xl border border-gray-300 bg-white shadow-lg overflow-visible z-50 text-sm text-gray-700 transition-all ${dur} ${
            menuOpen ? "max-h-64 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
          }`}
        >
          {menuItem("\u2B54", showStats ? "Hide Awards" : "Show Awards", onToggleStats, !showStats && !hasAwards)}
          {menuItem(
            <span className="inline-flex scale-[0.78] pointer-events-none">
              <VerifiedBadge verified collapsedOnly />
            </span>,
            "Edit Profile",
            onEdit
          )}
          {menuItem("\u26D3", "Create Paylink", onCreatePrefillUrl)}
          {menuItem("\u2934", "Share Refer Link", async () => {
            const baseUrl = buildShareUrl(profile);
            const referUrl = `${baseUrl}/refer`;
            const referTitle = `Invited by ${referDisplayName} to Zcash.me`;
            if (navigator.share) {
              try {
                await navigator.share({
                  title: referTitle,
                  text: referTitle,
                  url: referUrl,
                });
                return;
              } catch {}
            }
            await navigator.clipboard.writeText(referUrl);
            alert("Referral link copied to clipboard!");
          })}
          {menuItem(
            <span className="inline-flex scale-[0.78] origin-left">
              <VerifiedBadge verified variant="zcashName" verifiedLabel="Zcash Name" collapsedOnly />
            </span>,
            "Claim Name",
            onUpgrade,
            true
          )}
        </div>
      </div>

      {/* Share */}
      <motion.button
        onClick={async () => {
          const url = buildShareUrl(profile);
          if (navigator.share) {
            try {
              await navigator.share({
                title: `${displayName} on Zcash.me`,
                text: "Check out this Zcash profile:",
                url,
              });
              return;
            } catch {}
          }
          await navigator.clipboard.writeText(url);
          alert("Profile link copied to clipboard!");
        }}
        {...tapProps}
        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] hover:border-[var(--color-brand-blue)] hover:border-[var(--profile-hover-color)] hover:bg-[var(--color-brand-blue)]/10 hover:bg-[var(--profile-hover-bg)] transition-all"
        title={`Share ${displayName}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 opacity-80 transition-opacity hover:opacity-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4" />
          <path d="m8.6 13.5 6.8 4" />
        </svg>
      </motion.button>
    </>
  );
}
