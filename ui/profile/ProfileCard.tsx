"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getProfileTrust, getWarningConfig, getLastVerifiedLabel } from "@/lib/profile/profileUtils";
import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import ProfileEditor from "@/ui/profile/ProfileEditor";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import useProfileLinks from "@/ui/profile/useProfileLinks";
import VerifyProfileModal from "@/ui/verification/VerifyProfileModal";
import CreatePrefillUrlModal from "@/ui/profile/CreatePrefillUrlModal";
import { RedirectModal } from "@/ui/profile/editorModals";
import UpgradeToMaxiModal from "@/ui/profile/UpgradeToMaxiModal";
import { connectSocial } from "@/ui/links/connect";
import { useConnectCallback } from "@/ui/links/useConnectCallback";
import { upsertVerifiedLink } from "@/ui/links/verifyLink";
import { detectProviderFromUrl } from "@/ui/links/providers";
import { PROVIDERS } from "@/ui/links/providers";
import { enrichLink } from "@/lib/profile/profileLinks";
import {
  normalizeProfileThemePackageSelectionId,
  resolveProfileVisualTheme,
} from "@/lib/profile/profileCardTheme";
import { useEditsStore } from "@/ui/profile/store";
import ProfileCardListView from "./ProfileCardListView";
import ProfileCardActions from "./ProfileCardActions";
import ProfileCardWarning from "./ProfileCardWarning";
import ProfileLinkRow from "./ProfileLinkRow";
import ProfileCardDesignPanel from "./ProfileCardDesignPanel";
import { AnimatePresence, motion } from "framer-motion";
import type { EnrichedProfileLink } from "@/lib/profile/types";
import type { ProfileCardProps, LinkRowClasses } from "./profileCardTypes";
import { formatUsername } from "./profileCardUtils";

export type { ProfileCardTextScale } from "./profileCardTypes";

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_BORDER_MASK_WIDTH = AVATAR_SIZE + 18;

const RANK_PERIODS = ["alltime", "weekly", "monthly"] as const;
type RankPeriod = (typeof RANK_PERIODS)[number];
type RankBadgePeriod = "all" | Exclude<RankPeriod, "alltime">;
type WindowWithSkipFeedback = Window & { skipZcashFeedbackScroll?: boolean };

const LINK_ROW_CLASSES: LinkRowClasses = {
  row: "flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 min-w-0",
  left: "flex items-center gap-2 shrink-0",
  leftLink: "flex items-center gap-2 shrink-0 hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] transition-colors",
  right: "flex items-center gap-2 ml-auto min-w-0 text-sm text-gray-600 justify-end flex-1",
  icon: "w-4 h-4 rounded-xs opacity-80",
  label: "font-medium text-gray-800 whitespace-nowrap",
  domain: "flex-1 min-w-0 truncate text-right",
  copyWrapper: "shrink-0",
};

function isTruthyLikeAddressVerified(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

export default function ProfileCard({
  profile,
  tokens,
  fullView = false,
  duplicateNameCount = 0,
  onShowQR,
  onEditorModeChange,
  onGenerateVerificationQr,
  isVerificationGenerating = false,
  onDesignPanelBackgroundChange,
  cardWidthPx,
}: ProfileCardProps) {
  const router = useRouter();
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isPrefillUrlOpen, setIsPrefillUrlOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [showDesignBack, setShowDesignBack] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("");
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const { form, original, updateField } = useEditsStore();
  const { linksArray, setLinksArray } = useProfileLinks({ profile });

  const { verifiedAddress, verifiedLinks } = getProfileTrust(profile);
  const totalLinks = profile.total_links ?? linksArray.length;
  const warningConfig = getWarningConfig({
    profile,
    warning: true,
    verifiedAddress,
    verifiedLinks,
    totalLinks,
    hasDuplicateNames: duplicateNameCount > 1,
  });
  const hasAwards = RANK_PERIODS.some((p) => {
    const rank = profile[`rank_${p}`] ?? 0;
    return rank > 0 && rank <= 10;
  });
  const displayName = profile.display_name || profile.name || "";
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
  const isMaxi = isTruthyLikeAddressVerified(profile.is_maxi);
  const hasDesignAccess = isMaxi;
  const selectedThemePackageId = useMemo(() => {
    const hasThemePackageEdit = form.profile_theme_package !== original.profile_theme_package;
    const sourceValue = hasThemePackageEdit ? form.profile_theme_package : profile.profile_theme_package;
    return normalizeProfileThemePackageSelectionId(sourceValue) ?? "none";
  }, [
    form.profile_theme_package,
    original.profile_theme_package,
    profile.profile_theme_package,
  ]);

  const persistedTheme = useMemo(() => resolveProfileVisualTheme({
    isMaxi,
    profileThemePackage: profile.profile_theme_package,
    profileCardTheme: profile.profile_card_theme,
    profilePageBackground: profile.profile_page_bkgd,
    profileCardBorder: profile.profile_card_border,
  }), [
    isMaxi,
    profile.profile_theme_package,
    profile.profile_card_theme,
    profile.profile_page_bkgd,
    profile.profile_card_border,
  ]);

  const editingTheme = useMemo(() => resolveProfileVisualTheme({
    isMaxi,
    profileThemePackage: selectedThemePackageId,
    profileCardTheme: form.profile_card_theme,
    profilePageBackground: form.profile_page_bkgd,
    profileCardBorder: form.profile_card_border,
  }), [
    isMaxi,
    selectedThemePackageId,
    form.profile_card_theme,
    form.profile_page_bkgd,
    form.profile_card_border,
  ]);

  const activeCardBackground = persistedTheme.cardSurface;
  const activeCardBackgroundSolid = persistedTheme.cardSurfaceSolid;
  const activeCardText = persistedTheme.cardText;
  const avatarBorderColor = persistedTheme.borderColor ?? "#111827";
  const cardSecondaryTextColor = persistedTheme.cardIsDark ? "rgba(243, 244, 246, 0.86)" : "rgba(55, 65, 81, 0.9)";
  const cardSubtleTextColor = persistedTheme.cardIsDark ? "rgba(229, 231, 235, 0.78)" : "rgba(75, 85, 99, 0.85)";
  const profileHoverBackgroundColor = persistedTheme.cardIsDark ? "rgba(229, 231, 235, 0.14)" : "rgba(17, 24, 39, 0.08)";
  const designSideBackground = showBack ? editingTheme.pageBackground : persistedTheme.pageBackground;
  const hasMaxiPackage = persistedTheme.packageId === "maxi_theme";
  const wrapperBackground = showDesignBack
    ? designSideBackground
    : hasMaxiPackage
      ? `repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.12) 0px, rgba(255, 255, 255, 0.12) 1px, transparent 1px, transparent 9px), ${activeCardBackground}`
      : activeCardBackground;
  const linkRowClasses = LINK_ROW_CLASSES;

  const resolvedCardWidth = Number.isFinite(cardWidthPx)
    ? Math.min(760, Math.max(320, Math.round(cardWidthPx ?? 0)))
    : null;
  const actionInsetPx = resolvedCardWidth
    ? Math.min(24, Math.max(10, Math.round(resolvedCardWidth * 0.03)))
    : 16;
  const linkTrayMaxWidthPx = resolvedCardWidth
    ? Math.max(240, Math.round(resolvedCardWidth - 56))
    : 448;
  const selectedThemePackageLabel = selectedThemePackageId === "maxi_theme" ? "Maxi Theme" : "No Theme";

  const handleVerifyClick = useCallback(async (link: { url: string }) => {
    if (!profile.address_verified) return;
    const providerKey = detectProviderFromUrl(link.url || "");
    if (!providerKey || !PROVIDERS[providerKey]) return;

    setShowRedirect(true);
    setRedirectLabel(PROVIDERS[providerKey].label);

    try {
      await connectSocial(providerKey, {
        profileId: profile.id,
        returnPath: window.location.pathname,
      });
    } catch {
      setShowRedirect(false);
    }
  }, [profile.address_verified, profile.id]);

  const handleConnected = useCallback(async (link: { url: string; provider: string; handle: string; avatarUrl?: string | null; accessToken: string }) => {
    setShowRedirect(false);
    const result = await upsertVerifiedLink(profile.id, link.url, link.accessToken, undefined, link.avatarUrl ?? undefined);
    if (result.ok) {
      setLinksArray((prev) =>
        prev.map((l) =>
          l.url === link.url ? enrichLink({ ...l, is_verified: true }) : l
        )
      );
      router.refresh();
    }
  }, [profile.id, setLinksArray, router]);

  const handleConnectError = useCallback(() => {
    setShowRedirect(false);
  }, []);

  useConnectCallback({
    profileId: profile.id,
    onConnected: handleConnected,
    onError: handleConnectError,
  });

  useEffect(() => { onEditorModeChange?.(showBack); }, [showBack, onEditorModeChange]);
  useEffect(() => {
    if (!showBack) setShowDesignBack(false);
  }, [showBack]);
  useEffect(() => {
    if (!showDesignBack) setThemeMenuOpen(false);
  }, [showDesignBack]);
  useEffect(() => {
    if (!themeMenuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (themeMenuRef.current?.contains(event.target as Node)) return;
      setThemeMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [themeMenuOpen]);
  useEffect(() => {
    onDesignPanelBackgroundChange?.(showDesignBack ? designSideBackground : null);
  }, [showDesignBack, designSideBackground, onDesignPanelBackgroundChange]);
  useEffect(() => {
    return () => {
      onDesignPanelBackgroundChange?.(null);
    };
  }, [onDesignPanelBackgroundChange]);

  if (!fullView) return <ProfileCardListView profile={profile} />;

  return (
    <div style={{ marginTop: `${CARD_TOP_MARGIN + CARD_OFFSET_Y}px` }}>
      <div style={{ transform: `translateY(${AVATAR_OVERLAP_Y}px)` }}>
        <VerifiedCardWrapper
          verifiedCount={(profile.verified_links_count ?? 0) + (profile.address_verified ? 1 : 0)}
          featured={!!profile.featured}
          borderAccentColor={avatarBorderColor}
          unstyled={showDesignBack}
          className="relative overflow-visible mx-auto mb-8 p-6 animate-fadeIn text-center w-full !rounded-[26px]"
          style={{
            width: resolvedCardWidth ? `${resolvedCardWidth}px` : undefined,
            maxWidth: "100%",
            background: wrapperBackground,
            color: activeCardText,
          }}
          data-active-profile
          data-address={profile.address}
        >
          {!showDesignBack && (
            <div
              className="pointer-events-none absolute -top-[2px] left-1/2 z-0 h-[6px] -translate-x-1/2 rounded-b-full"
              style={{
                width: `${AVATAR_BORDER_MASK_WIDTH}px`,
                backgroundColor: activeCardBackgroundSolid,
              }}
              aria-hidden
            />
          )}

          <div
            className={`relative transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180" : ""}`}
            style={{ transformOrigin: "top center", willChange: "transform" }}
          >
            <div
              className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full rounded-[26px]`}
              style={
                {
                  background: activeCardBackground,
                  color: activeCardText,
                  "--profile-hover-color": activeCardText,
                  "--profile-hover-bg": profileHoverBackgroundColor,
                } as CSSProperties
              }
            >
              <div
                className={`absolute left-4 right-4 z-10 flex items-center justify-between transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 backface-hidden"}`}
                style={{
                  top: `${ACTION_BUTTONS_TOP}px`,
                  left: `${actionInsetPx}px`,
                  right: `${actionInsetPx}px`,
                }}
              >
                <ProfileCardActions
                  profile={profile}
                  hasAwards={hasAwards}
                  showStats={showStats}
                  onToggleStats={() => setShowStats((p) => !p)}
                  onEdit={() => setShowBack(true)}
                  onVerify={() => setIsVerifyOpen(true)}
                  onCreatePrefillUrl={() => setIsPrefillUrlOpen(true)}
                  onUpgrade={() => setIsUpgradeOpen(true)}
                />
              </div>

              <div
                className={`absolute left-1/2 top-0 z-20 transition-all duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 opacity-100"}`}
                style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px))` }}
                aria-hidden={showBack}
              >
                <ProfileAvatar
                  profile={profile}
                  size={AVATAR_SIZE}
                  imageClassName="object-contain"
                  className="mx-auto shadow-xs flex items-center justify-center"
                  borderColor={avatarBorderColor}
                />
              </div>
              <div style={{ paddingTop: `${AVATAR_SPACER}px` }} aria-hidden />

              <AnimatePresence>
                {showStats && (
                  <motion.div
                    key="awards"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.8 }}
                    className="flex flex-wrap justify-center gap-2 mt-3 mb-1"
                  >
                    {RANK_PERIODS.map((period) => {
                      const rank = profile[`rank_${period}`];
                      if (!rank || rank <= 0) return null;
                      const badgePeriod: RankBadgePeriod = period === "alltime" ? "all" : period;
                      return <ReferRankBadgeMulti key={period} rank={rank} period={badgePeriod} alwaysOpen />;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3 flex flex-col items-center">
                <h2
                  className="text-3xl font-black leading-tight flex items-center justify-center gap-2"
                  style={{ color: activeCardText }}
                >
                  {displayName}
                  {isVerified && <VerifiedBadge verified />}
                </h2>
                <div className="text-base font-medium mt-1" style={{ color: cardSubtleTextColor }}>
                  /{formatUsername(profile)}
                </div>
              </div>

              {profile.bio?.trim() && (
                <p
                  className="mt-1 text-sm text-center max-w-[90%] mx-auto whitespace-pre-line break-words"
                  style={{ color: cardSecondaryTextColor }}
                >
                  {profile.bio}
                </p>
              )}

              <p
                className="mt-3 text-xs flex flex-wrap justify-center gap-x-1 gap-y-0.5"
                style={{ color: cardSubtleTextColor }}
              >
                {profile.nearest_city_name && (
                  <>
                    <span className="whitespace-nowrap">Near {profile.nearest_city_name}</span>
                    <span className="opacity-70" aria-hidden>{"\u2022"}</span>
                  </>
                )}
                <span className="whitespace-nowrap">
                  Joined {new Date(profile.joined_at || profile.created_at || profile.since || new Date().toISOString()).toLocaleString("default", { month: "short", year: "numeric" })}
                </span>
                {profile.address_verified === true && (
                  <>
                    <span className="opacity-70" aria-hidden>{"\u2022"}</span>
                    <span className="whitespace-nowrap">Active {getLastVerifiedLabel(profile.last_verified_at || profile.last_verified)}</span>
                  </>
                )}
              </p>

              {profile.address ? (
                <div className="mt-2 flex items-center justify-center">
                  <div
                    className="relative overflow-hidden flex items-center gap-2 border border-gray-300 bg-white/80 text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-inner w-fit max-w-[90%]"
                  >
                    <span className="pointer-events-none absolute left-[6%] right-[6%] top-0 h-[5px] rounded-full bg-linear-to-b from-gray-200/55 to-transparent" aria-hidden />
                    <span className="select-all" title={profile.address}>
                      {profile.address.slice(0, 6)}...{profile.address.slice(-6)}
                    </span>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <button
                        onClick={() => onShowQR?.()}
                        className="group flex items-center justify-center hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] transition-all px-1 overflow-hidden"
                        style={{ color: "#6b7280" }}
                        title="Show QR"
                      >
                        QR
                      </button>
                      <CopyButton
                        text={profile.address}
                        label="Copy"
                        copiedLabel="Copied"
                        hoverColor="var(--color-brand-blue)"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm italic" style={{ color: cardSubtleTextColor }}>-</p>
              )}

              <div
                className="relative flex flex-col items-center w-full mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0"
                style={{
                  maxWidth: `${linkTrayMaxWidthPx}px`,
                  "--profile-hover-color": "var(--color-brand-blue)",
                } as CSSProperties}
              >
                <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
                  <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                    {linksArray.length > 0
                      ? linksArray.map((link: EnrichedProfileLink) => <ProfileLinkRow key={link.id || link.url} link={link} classes={linkRowClasses} onVerifyClick={profile.address_verified ? handleVerifyClick : undefined} />)
                      : <p className="italic text-gray-500 text-center">No contributed links yet.</p>}
                  </div>
                </div>
              </div>

              {warningConfig && <ProfileCardWarning config={warningConfig} />}
            </div>

            {showBack ? (
            <div
              className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full relative h-auto ${
                showDesignBack
                  ? "rounded-[26px] border-0 bg-transparent shadow-none p-0"
                  : "bg-white rounded-[26px] border border-gray-300 shadow-inner p-5"
              } flex flex-col items-center justify-start overflow-visible`}
              style={{
                pointerEvents: "auto",
                background: showDesignBack ? designSideBackground : undefined,
              }}
            >
              <div
                className={`absolute left-1/2 top-0 z-20 transition-all duration-300 ${
                  showBack && !showDesignBack ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px)) scaleX(-1)` }}
                aria-hidden={!showBack || showDesignBack}
              >
                <ProfileAvatar
                  profile={profile}
                  size={AVATAR_SIZE}
                  imageClassName="object-contain"
                  className="mx-auto shadow-xs flex items-center justify-center"
                  borderColor={avatarBorderColor}
                />
              </div>
              <div style={{ paddingTop: `${AVATAR_SPACER}px` }} aria-hidden />

              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (showDesignBack) {
                      setShowDesignBack(false);
                      return;
                    }
                    (window as WindowWithSkipFeedback).skipZcashFeedbackScroll = true;
                    setShowBack(false);
                  }}
                  title={showDesignBack ? "Return to editor" : "Return to front"}
                  aria-label={showDesignBack ? "Return to editor" : "Return to front"}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-brand-blue)] text-white text-sm hover:bg-[var(--color-brand-blue)]/90 transition-all shadow-md"
                >
                  {"\u21BA"}
                </button>
                {showDesignBack ? (
                  <div ref={themeMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setThemeMenuOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 h-9 text-sm font-semibold whitespace-nowrap transition-all border-gray-300 bg-white/90 text-gray-700 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                      aria-haspopup="menu"
                      aria-expanded={themeMenuOpen}
                      aria-label="Themes"
                      title="Themes"
                    >
                      <span>{selectedThemePackageLabel}</span>
                      <span
                        aria-hidden
                        className={`inline-block text-xl leading-none transition-transform ${themeMenuOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        {"\u25BE"}
                      </span>
                    </button>
                    <div
                      aria-hidden={!themeMenuOpen}
                      className={`absolute right-0 top-full mt-1 inline-flex w-max min-w-full flex-col items-stretch origin-top-right rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden z-50 text-sm text-gray-700 transition-all duration-200 ${
                        themeMenuOpen ? "max-h-40 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          updateField("profile_theme_package", "maxi_theme");
                          setThemeMenuOpen(false);
                        }}
                        role="menuitem"
                        className={`w-full whitespace-nowrap text-center px-3 py-2 transition-colors text-gray-800 hover:bg-[var(--color-brand-blue)]/10 ${
                          selectedThemePackageId === "maxi_theme" ? "bg-[var(--color-brand-blue)]/10 font-semibold" : ""
                        }`}
                      >
                        Maxi Theme
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateField("profile_theme_package", "none");
                          setThemeMenuOpen(false);
                        }}
                        role="menuitem"
                        className={`w-full whitespace-nowrap text-center px-3 py-2 transition-colors text-gray-800 hover:bg-[var(--color-brand-blue)]/10 ${
                          selectedThemePackageId === "none" ? "bg-[var(--color-brand-blue)]/10 font-semibold" : ""
                        }`}
                      >
                        No Theme
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasDesignAccess) {
                        setIsUpgradeOpen(true);
                        return;
                      }
                      setShowDesignBack(true);
                    }}
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all shadow-md ${
                      hasDesignAccess
                        ? "border-gray-300 bg-white/90 text-black hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                        : "border-gray-300 bg-white/90 text-black hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                    }`}
                    aria-label="Design"
                    title={hasDesignAccess ? "Design" : "Design (Maxi required)"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="42 14 238 238"
                      fill="none"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M112 93L93 111L92 119L115 145L116 152L114 158L106 166L53 201L46 209L42 218L42 229L47 240L54 247L64 252L77 252L90 245L97 237L127 190L135 181L140 179L149 179L177 203L185 200L201 183ZM70 211L77 213L83 220L81 230L74 235L65 233L60 227L60 219L65 213ZM192 14L188 16L126 78L125 81L214 170L280 104L280 98L264 82L255 83L233 98L232 96L248 73L248 66L219 37L213 36L209 38L209 28L198 16Z"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div
                className={`relative w-full transition-transform duration-300 transform-style-preserve-3d ${showDesignBack ? "rotate-y-neg-180" : "rotate-y-0"}`}
                style={{ transformOrigin: "center center", willChange: "transform" }}
              >
                <div
                  className={`${
                    !showBack || showDesignBack
                      ? "absolute inset-0 z-0 opacity-0 pointer-events-none"
                      : "relative h-auto z-10 opacity-100 pointer-events-auto"
                  } backface-hidden top-0 left-0 w-full transition-opacity duration-200`}
                >
                  {showBack ? (
                    <ProfileEditor
                      profile={profile}
                      links={linksArray}
                      onAuthenticateLink={profile.address_verified ? (link) => handleVerifyClick(link as EnrichedProfileLink) : undefined}
                      onGenerateQr={onGenerateVerificationQr}
                      isVerificationGenerating={isVerificationGenerating}
                    />
                  ) : null}
                </div>

                <div
                  className={`${
                    showBack && showDesignBack
                      ? "relative h-auto z-10 opacity-100 pointer-events-auto"
                      : "absolute inset-0 z-0 opacity-0 pointer-events-none"
                  } rotate-y-neg-180 backface-hidden top-0 left-0 w-full transition-opacity duration-200`}
                >
                  {showBack && showDesignBack ? (
                    <ProfileCardDesignPanel profile={profile} onGenerateQr={onGenerateVerificationQr} />
                  ) : null}
                </div>
              </div>
            </div>
            ) : null}
          </div>

          {isVerifyOpen && <VerifyProfileModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} profile={profile} />}
          {isPrefillUrlOpen && (
            <CreatePrefillUrlModal
              isOpen={isPrefillUrlOpen}
              onClose={() => setIsPrefillUrlOpen(false)}
              profile={profile}
              tokens={tokens}
            />
          )}
          <RedirectModal isOpen={showRedirect} label={redirectLabel} />
          <UpgradeToMaxiModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} profile={profile} />
        </VerifiedCardWrapper>
      </div>
    </div>
  );
}

