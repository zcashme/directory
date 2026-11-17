"use client";

import type { Profile } from "@/lib/profile/types";
import { formatZnsZecLabel, normalizeZnsName, znsClaimHref, ZCASH_NAMES_ORIGIN } from "@/lib/zns/name";
import { getClaimNameAvailability } from "@/lib/zns/claimAvailability";
import { PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";
import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import ProfileWalletList from "./ProfileWalletList";
import VerifiedBadge from "./VerifiedBadge";

interface ProfileClaimProps {
  profile: Profile;
  onGoBack: () => void;
}

export default function ProfileClaim({ profile, onGoBack }: ProfileClaimProps) {
  const [keepProfileOpen, setKeepProfileOpen] = useState(false);
  const detailsId = useId();
  const reducedMotion = useReducedMotion();
  const panelClass = "flex items-center gap-4 py-2";
  const iconClass = "flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20";
  const titleClass = "text-sm font-bold leading-relaxed text-slate-950";
  const name = normalizeZnsName(profile.name || "");
  const zecLabel = formatZnsZecLabel(name) || "this name";
  const address = (profile.address || "").trim();
  const claimHref = znsClaimHref(name, address);
  const claimedUrl = name ? `zcash.me/${name}` : "zcash.me/{name}";
  const [availabilityResult, setAvailabilityResult] = useState<{
    name: string;
    status: "available" | "unavailable" | "unknown";
  } | null>(null);
  const availability = availabilityResult?.name === name ? availabilityResult.status : "checking";
  const isAvailable = availability === "available";
  const isUnavailable = availability === "unavailable";
  const isChecking = availability === "checking";
  useEffect(() => {
    let cancelled = false;
    void getClaimNameAvailability(name).then((status) => {
      if (!cancelled) setAvailabilityResult({ name, status });
    }).catch(() => {
      if (!cancelled) setAvailabilityResult({ name, status: "unknown" });
    });
    return () => { cancelled = true; };
  }, [name]);

  return (
    <div className="w-full text-left text-sm text-gray-800" data-profile-claim-design="benefit-panels">
      <div className="mt-2 mb-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span role="status" className={`rounded-full px-4 py-2 text-center font-semibold ${isAvailable ? "bg-green-100 text-green-800" : isUnavailable ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>
          {isAvailable ? `${zecLabel} is available` : isUnavailable ? `${zecLabel} is unavailable` : isChecking ? `Checking ${zecLabel}…` : `Could not check ${zecLabel}`}
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <ul className="list-none space-y-1 p-0">
        <li className={panelClass}>
          <div className={iconClass}><ProfileWalletList compact /></div>
          <div className="min-w-0"><h3 className={titleClass}>Works across wallets</h3><p className="mt-1 leading-relaxed text-gray-700">Use your name in Zingo, Edge, Cake, Unstoppable, Noir, Zucchini, and more.</p></div>
        </li>
        <li className={panelClass}>
          <div className={`${iconClass} text-blue-600`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 -rotate-12"><path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
          </div>
          <div className="min-w-0"><h3 className={titleClass}>Share a simpler link</h3><p className="mt-1 leading-relaxed text-gray-700"><strong className="break-all">{claimedUrl}</strong> is easier to remember than <span className="break-all">zcash.me/{name}-{profile.id}</span>.</p></div>
        </li>
        <li className={panelClass}>
          <div className={iconClass}><span className="inline-flex scale-[1.8]"><VerifiedBadge verified variant="zcashName" collapsedOnly /></span></div>
          <div className="min-w-0"><h3 className={titleClass}>Build trust before payments</h3><p className="mt-1 leading-relaxed text-gray-700">People can view your profile before sending funds.</p></div>
        </li>
        <li className={panelClass}>
          <div className={iconClass} aria-hidden="true">
            <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none"><path d="M24 6C13 6 5 14 5 25c0 10 7 17 16 17 4 0 5-3 3-6-2-4 1-7 5-6h5c7 0 10-4 9-10C42 12 34 6 24 6Z" fill="white" stroke="#c4b5fd" strokeWidth="1.5"/><circle cx="15" cy="18" r="3" fill="#fbbf24"/><circle cx="25" cy="13" r="3" fill="#f472b6"/><circle cx="12" cy="28" r="3" fill="#818cf8"/><path d="m27 30 13-18c3-4 7-1 4 3L31 34Z" fill="#7c3aed"/><path d="M29 30c-6-1-3 8-9 9 8 3 15-1 12-6Z" fill="#8b5cf6"/></svg>
          </div>
          <div className="min-w-0"><h3 className={titleClass}>Make it yours</h3><p className="mt-1 leading-relaxed text-gray-700">Customize your badge, card colors, backgrounds, and patterns.</p></div>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap justify-center gap-3 border-t border-slate-200 pt-5">
        <a
          href={!isChecking ? (isAvailable ? claimHref : `${ZCASH_NAMES_ORIGIN}/claim`) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={isChecking}
          className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} !px-4 !py-3 !text-[var(--color-brand-blue)] ${isChecking ? "pointer-events-none opacity-60" : ""}`}
        >
          {isAvailable ? `Claim ${zecLabel}` : "Claim a name"}
        </a>
        <button
          type="button"
          onClick={onGoBack}
          className={`${PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES} !px-4 !py-3`}
        >
          Go Back
        </button>
      </div>
      <h3 className="mt-5 text-center">
        <button type="button" className="text-sm font-semibold leading-relaxed text-[var(--color-brand-blue)] hover:underline" aria-expanded={keepProfileOpen} aria-controls={detailsId} onClick={() => setKeepProfileOpen(!keepProfileOpen)}>{isUnavailable ? "You'll get another Zcash.me profile" : "Want to keep this profile?"}</button>
      </h3>
      <div id={detailsId} inert={!keepProfileOpen} aria-hidden={!keepProfileOpen} className={`grid transition-[grid-template-rows,opacity] ${reducedMotion ? "duration-100" : "duration-300 ease-in-out"} ${keepProfileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
          {isUnavailable ? (
            <p className="mt-3 text-gray-600">Claiming a different name will create another Zcash.me profile for that name. This profile and its contents will stay here.</p>
          ) : (
          <>
          <p className="mt-3 text-gray-600">Claim {zecLabel} using the address already associated with it:</p>
          <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs break-all select-all">{address || "No address on this profile"}</p>
          <p className="mt-3 text-gray-600">Using another address will create a new profile at {claimedUrl}.</p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
