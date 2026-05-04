"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { Profile } from "@/lib/profile/types";
import MaxiUpgrade from "@/ui/profile/MaxiUpgrade";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";

const COMPARISON_ROWS = [
  {
    title: "{profile.name}.zcash",
    description: "Your name is easier to remember and share as Zcash.me/{profile.name} instead of Zcash.me/{profile.name}-{profile.id}.",
  },
  {
    title: "Sign in with your name",
    description: "Access your profile without repeated OTP to make changes instantly.",
  },
  {
    title: "You own it. No renewal fees.",
    description: "Your name is registered to you on-chain. Just sign in once every 90 days to keep it active.",
  },
  {
    title: "Buy and sell names",
    description: "List your .zcash name for sale or get another in our upcoming marketplace.",
  },
  {
    title: "Works across apps",
    description: "Use the same name in a growing number of wallets and apps supporting .zcash names.",
  },
  {
    title: "Don't trust us, verify us on-chain.",
    description: "Your name points to your address. You can see that on-chain with our view-key.",
  },
  {
    title: "Customize your profile",
    description: ".zcash name owners can add themes and badges after sign-in or verification.",
  },
  {
    title: "Earn from referring others",
    description: "Get commission when others mention your name while claiming their own.",
  },
];

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const PAYMENT_FLOW_SPACER = 40;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_TUNE_Y = 20;

interface UpgradeToMaxiModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

export default function UpgradeToMaxiModal({ isOpen, onClose, profile }: UpgradeToMaxiModalProps) {
  const [isPaymentFlowExpanded, setIsPaymentFlowExpanded] = useState(false);
  const [collapsePaymentFlow, setCollapsePaymentFlow] = useState<(() => void) | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const featureListRef = useRef<HTMLDivElement | null>(null);
  const topSpacer = isPaymentFlowExpanded ? PAYMENT_FLOW_SPACER : AVATAR_SPACER;
  const profileNameRaw = (profile.name ?? "").trim() || "zcasher.name";
  const profileName = profileNameRaw.charAt(0).toUpperCase() + profileNameRaw.slice(1).toLowerCase();
  const profileId = profile.id !== null && profile.id !== undefined ? String(profile.id) : "zcasher.id";
  const headerKicker = `Claim your .zcash name`;
  const headerTitle = `${profileName}.zcash`;
  const comparisonRows = COMPARISON_ROWS.map((row, idx) => {
    if (idx === 0) {
      return {
        ...row,
        title: `/${profileName} without -${profileId}`,
        description: `Zcash.me/${profileName} instead of /${profileName}-${profileId}. Soon, ${profileName}.zcash.`,
      };
    }
    if (idx === 1) {
      return { ...row, title: `Sign in with ${profileName}` };
    }
    if (idx === 2) {
      return { ...row, title: `No renewal fees` };
    }
    if (idx === 3) {
      return { ...row, title: `Buy and sell names like ${profileName}` };
    }
    if (idx === 4) {
      return { ...row, title: `${profileName} works across apps` };
    }
    if (idx === 5) {
      return { ...row, title: `Don't trust us, verify ${profileName} on-chain` };
    }
    if (idx === 6) {
      return { ...row, title: `Premium  profile for ${profileName}` };
    }
    if (idx === 7) {
      return { ...row, description: `Get rewards when others mention ${profileName} while claiming their own.` };
    }
    return row;
  });

  const resetModalUiState = useCallback(() => {
    setIsPaymentFlowExpanded(false);
    setCollapsePaymentFlow(null);
    setExpandedFeature(null);
    setShowBackToTop(false);
    featureListRef.current?.scrollTo({ top: 0 });
  }, []);

  const handleClose = useCallback(() => {
    collapsePaymentFlow?.();
    resetModalUiState();
    onClose();
  }, [collapsePaymentFlow, onClose, resetModalUiState]);

  useEffect(() => {
    if (isOpen) return;
    resetModalUiState();
  }, [isOpen, resetModalUiState]);

  if (!isOpen || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto px-4 py-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 my-4"
        style={{ transform: `translateY(${AVATAR_OVERLAP_Y}px)` }}
      >
        <div
          className="absolute left-1/2 top-0 z-30"
          style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px + ${AVATAR_TUNE_Y}px))` }}
        >
          <ProfileAvatar
            profile={profile}
            size={AVATAR_SIZE}
            imageClassName="object-contain"
            className="mx-auto shadow-xs flex items-center justify-center"
            borderColor="rgba(253, 230, 138, 0.7)"
          />
        </div>

        <div className="relative h-[min(700px,calc(100vh-2.5rem))] overflow-hidden rounded-[26px] border border-amber-200/70 shadow-[0_22px_60px_-18px_rgba(0,0,0,0.65),0_0_35px_rgba(234,179,8,0.25)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(250,204,21,0.28),transparent_45%),radial-gradient(circle_at_85%_14%,rgba(34,197,94,0.35),transparent_52%),linear-gradient(155deg,rgba(7,61,34,0.95)_0%,rgba(6,78,59,0.96)_44%,rgba(101,163,13,0.9)_100%)]" />
          <div className="maxi-holo-shimmer absolute inset-0 opacity-60 mix-blend-screen bg-[linear-gradient(120deg,rgba(250,204,21,0.24)_0%,rgba(187,247,208,0.24)_20%,rgba(134,239,172,0.2)_36%,rgba(250,204,21,0.14)_55%,rgba(125,211,252,0.22)_76%,rgba(250,204,21,0.3)_100%)]" />
          <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.12)_0px,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_9px)]" />
          <div className="absolute inset-[1px] rounded-[24px] border border-white/25 pointer-events-none" />

          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 rounded-full px-3 py-1 text-sm font-semibold text-amber-50/90 hover:bg-amber-300/20 hover:text-white transition-colors"
            aria-label="Close"
          >
            Close
          </button>
          {isPaymentFlowExpanded && (
            <button
              type="button"
              onClick={() => collapsePaymentFlow?.()}
              className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-amber-50/90 hover:bg-amber-300/20 hover:text-white transition-colors"
              aria-label="Collapse payment section"
              title="Back"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5l-5 5 5 5" />
                <path d="M4 10h13" />
              </svg>
              <span>Back</span>
            </button>
          )}

          <div className={`relative z-10 flex h-full flex-col overflow-y-auto px-6 pt-6 ${isPaymentFlowExpanded ? "pb-3" : "pb-6"}`}>
            <div style={{ paddingTop: `${topSpacer}px` }} aria-hidden />
            <div
              className={`overflow-hidden text-center transition-[max-height,opacity,margin] duration-300 ${
                isPaymentFlowExpanded ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-40 opacity-100"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/85">{headerKicker}</p>
              <h2 className="mt-1 text-center text-2xl font-extrabold tracking-tight text-amber-50 inline-flex items-center justify-center gap-2">
                <span>{headerTitle}</span>
                <VerifiedBadge verified variant="zcashName" verifiedLabel="Zcash Name" href="https://zcashnames.com" />
              </h2>
              <p className="mt-2 text-sm text-emerald-50/80">
                Make your name your address.
              </p>
            </div>

            <div className="pt-1">
              <MaxiUpgrade
                profile={profile}
                onClose={onClose}
                onFlowExpandedChange={setIsPaymentFlowExpanded}
                onRegisterCollapseAction={(action) => setCollapsePaymentFlow(() => action)}
              />
            </div>

            <div
              className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ${
                isPaymentFlowExpanded ? "mt-0 max-h-0 opacity-0" : "mt-6 flex flex-1 min-h-0 max-h-[1000px] flex-col opacity-100 border-t border-amber-100/25 pt-4"
              }`}
            >
              <div
                ref={featureListRef}
                onScroll={(event) => setShowBackToTop(event.currentTarget.scrollTop > 40)}
                className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1 pb-4"
              >
                {comparisonRows.map((row) => {
                  const isExpanded = expandedFeature === row.title;

                  return (
                    <div
                      key={row.title}
                      className="rounded-xl border border-emerald-100/20 bg-black/10 px-3 py-2.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFeature((prev) => (prev === row.title ? null : row.title))}
                        aria-expanded={isExpanded}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="mt-0.5 inline-flex w-5 shrink-0 justify-center scale-[0.78] pointer-events-none">
                          <VerifiedBadge verified variant="zcashName" verifiedLabel="Zcash Name" collapsedOnly />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-emerald-50/95">{row.title}</span>
                        </span>
                        <span className="pt-0.5 inline-flex w-4 shrink-0 justify-center text-base font-semibold leading-none text-amber-100/90">
                          {isExpanded ? "-" : "+"}
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-[max-height,opacity,margin] duration-250 ${
                          isExpanded ? "mt-2 max-h-36 opacity-100" : "mt-0 max-h-0 opacity-0"
                        }`}
                      >
                        <p className="ml-8 text-xs leading-relaxed text-emerald-50/85">
                          {row.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className={`pt-2 pb-1 flex justify-center border-t border-amber-100/20 transition-opacity ${
                  showBackToTop ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  onClick={() => featureListRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-xs font-semibold text-amber-100/95 underline decoration-amber-100/70 underline-offset-2 hover:text-amber-50 transition-colors"
                >
                  Top
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
