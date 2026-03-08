"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Profile, EnrichedProfileLink, ProfileLink } from "@/lib/profile/types";
import { useEditsStore, type ParsedLink } from "@/ui/profile/store";
import Button from "@/ui/common/buttons/Button";
import { validateZcashAddress } from "@/ui/signup/zcashAddress";
import {
  PROFILE_CARD_THEMES,
  normalizeProfileCardThemeId,
  normalizeProfilePageBackgroundId,
  resolveProfileCardColors,
  resolveProfilePageBackgroundColor,
} from "@/lib/profile/profileCardTheme";
import { getProfileTrust, getWarningConfig, getLastVerifiedLabel } from "@/lib/profile/profileUtils";
import { enrichLink } from "@/lib/profile/profileLinks";
import VerifiedCardWrapper from "@/ui/profile/VerifiedCardWrapper";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import ProfileCardActions from "@/ui/profile/ProfileCardActions";
import ProfileCardWarning from "@/ui/profile/ProfileCardWarning";
import ProfileLinkRow from "@/ui/profile/ProfileLinkRow";
import CopyButton from "@/ui/common/buttons/CopyButton";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import { AnimatePresence, motion } from "framer-motion";
import type { LinkRowClasses } from "@/ui/profile/profileCardTypes";
import { formatUsername } from "@/ui/profile/profileCardUtils";

interface ProfileCardDesignPanelProps {
  profile: Profile;
  onGenerateQr?: () => void;
}

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_BORDER_MASK_WIDTH = AVATAR_SIZE + 18;

const RANK_PERIODS = ["alltime", "weekly", "monthly"] as const;
type RankPeriod = (typeof RANK_PERIODS)[number];
type RankBadgePeriod = "all" | Exclude<RankPeriod, "alltime">;

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

const DARK_LINK_ROW_CLASSES: LinkRowClasses = {
  row: "flex items-center gap-3 py-1 border-b border-white/20 last:border-0 min-w-0",
  left: "flex items-center gap-2 shrink-0",
  leftLink: "flex items-center gap-2 shrink-0 hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] transition-colors",
  right: "flex items-center gap-2 ml-auto min-w-0 text-sm text-white/80 justify-end flex-1",
  icon: "w-4 h-4 rounded-xs opacity-90",
  label: "font-medium text-white whitespace-nowrap",
  domain: "flex-1 min-w-0 truncate text-right text-white/80",
  copyWrapper: "shrink-0",
};

function mapFormLinksToProfileLinks(links: ParsedLink[]): ProfileLink[] {
  return links
    .filter((link) => !link._delete && (link.url ?? "").trim().length > 0)
    .map((link) => {
      const url = (link.url ?? "").trim();
      return {
        id: link.id ?? null,
        url,
        label: (link.label || link.username || link.platform || url).trim(),
        platform: link.platform ?? null,
        is_verified: Boolean(link.is_verified),
        verification_expires_at: link.verification_expires_at,
      };
    });
}

export default function ProfileCardDesignPanel({ profile, onGenerateQr }: ProfileCardDesignPanelProps) {
  const { form, deletedFields, pendingAvatarUpload, updateField } = useEditsStore();
  const [showStats, setShowStats] = useState(false);

  const hasStoreValues = useMemo(() => {
    return (
      Boolean(pendingAvatarUpload) ||
      deletedFields.address ||
      deletedFields.name ||
      deletedFields.display_name ||
      deletedFields.bio ||
      deletedFields.profile_image_url ||
      deletedFields.nearest_city ||
      form.address !== "" ||
      form.name !== "" ||
      form.display_name !== "" ||
      form.bio !== "" ||
      form.profile_image_url !== "" ||
      form.profile_card_theme !== "" ||
      form.profile_page_bkgd !== "" ||
      form.nearest_city_name !== "" ||
      form.links.length > 0
    );
  }, [
    form.address,
    form.name,
    form.display_name,
    form.bio,
    form.profile_image_url,
    form.profile_card_theme,
    form.profile_page_bkgd,
    form.nearest_city_name,
    form.links,
    deletedFields.address,
    deletedFields.name,
    deletedFields.display_name,
    deletedFields.bio,
    deletedFields.profile_image_url,
    deletedFields.nearest_city,
    pendingAvatarUpload,
  ]);

  const pendingAvatarPreviewSrc = useMemo(() => {
    if (!pendingAvatarUpload) return "";
    return `data:${pendingAvatarUpload.mimeType};base64,${pendingAvatarUpload.base64Data}`;
  }, [pendingAvatarUpload]);

  const selectedCardThemeId = useMemo(() => {
    if (!hasStoreValues) {
      return normalizeProfileCardThemeId(profile.profile_card_theme);
    }
    return normalizeProfileCardThemeId(form.profile_card_theme);
  }, [hasStoreValues, profile.profile_card_theme, form.profile_card_theme]);

  const selectedPageBackgroundId = useMemo(() => {
    if (!hasStoreValues) {
      return normalizeProfilePageBackgroundId(profile.profile_page_bkgd);
    }
    return normalizeProfilePageBackgroundId(form.profile_page_bkgd);
  }, [hasStoreValues, profile.profile_page_bkgd, form.profile_page_bkgd]);

  const previewName = hasStoreValues
    ? (deletedFields.name ? "" : form.name)
    : (profile.name ?? "");
  const previewDisplayName = hasStoreValues
    ? (deletedFields.display_name ? "" : form.display_name)
    : (profile.display_name ?? "");
  const previewBio = hasStoreValues
    ? (deletedFields.bio ? "" : form.bio)
    : (profile.bio ?? "");
  const previewAddress = hasStoreValues
    ? (deletedFields.address ? "" : form.address.trim())
    : (profile.address ?? "");
  const previewNearestCity = hasStoreValues
    ? (deletedFields.nearest_city ? "" : form.nearest_city_name)
    : (profile.nearest_city_name ?? "");
  const previewImageUrl = hasStoreValues
    ? (
      deletedFields.profile_image_url
        ? ""
        : (pendingAvatarPreviewSrc || form.profile_image_url || profile.profile_image_url || "")
    )
    : (profile.profile_image_url ?? "");

  const previewProfile = useMemo<Profile>(() => ({
    ...profile,
    name: previewName,
    display_name: previewDisplayName,
    bio: previewBio,
    address: previewAddress,
    nearest_city_name: previewNearestCity,
    profile_image_url: previewImageUrl || undefined,
    profile_card_theme: selectedCardThemeId,
    profile_page_bkgd: selectedPageBackgroundId,
  }), [
    profile,
    previewName,
    previewDisplayName,
    previewBio,
    previewAddress,
    previewNearestCity,
    previewImageUrl,
    selectedCardThemeId,
    selectedPageBackgroundId,
  ]);

  const linksArray = useMemo<EnrichedProfileLink[]>(() => {
    const rawLinks = hasStoreValues
      ? mapFormLinksToProfileLinks(form.links)
      : (Array.isArray(profile.links) ? profile.links : []);
    return rawLinks.map(enrichLink);
  }, [hasStoreValues, form.links, profile.links]);

  const { verifiedAddress, verifiedLinks } = getProfileTrust(previewProfile);
  const totalLinks = previewProfile.total_links ?? linksArray.length;
  const warningConfig = getWarningConfig({
    profile: previewProfile,
    warning: true,
    verifiedAddress,
    verifiedLinks,
    totalLinks,
    hasDuplicateNames: false,
  });
  const hasAwards = RANK_PERIODS.some((period) => {
    const rank = previewProfile[`rank_${period}`];
    return typeof rank === "number" && rank > 0 && rank <= 10;
  });
  const displayName = previewProfile.display_name || previewProfile.name || "";
  const isVerified = previewProfile.address_verified || (previewProfile.verified_links_count ?? 0) > 0;

  const { theme: activeCardTheme, background: activeCardBackground, text: activeCardText } =
    resolveProfileCardColors(selectedCardThemeId);
  const { theme: activePageBackgroundTheme, background: activePageBackground } =
    resolveProfilePageBackgroundColor(selectedPageBackgroundId);
  const cardSecondaryTextColor = activeCardTheme?.isDark ? "rgba(243, 244, 246, 0.86)" : "rgba(55, 65, 81, 0.9)";
  const cardSubtleTextColor = activeCardTheme?.isDark ? "rgba(229, 231, 235, 0.78)" : "rgba(75, 85, 99, 0.85)";
  const cardSurfaceColor = activeCardBackground;
  const cardSurfaceBorderColor = activeCardTheme?.isDark ? "rgba(229, 231, 235, 0.26)" : "rgba(17, 24, 39, 0.16)";
  const profileHoverBackgroundColor = activeCardTheme?.isDark ? "rgba(229, 231, 235, 0.14)" : "rgba(17, 24, 39, 0.08)";
  const previewDotColor = activePageBackgroundTheme?.isDark ? "rgba(229, 231, 235, 0.28)" : "rgba(148, 163, 184, 0.45)";
  const linkRowClasses = activeCardTheme?.isDark ? DARK_LINK_ROW_CLASSES : LINK_ROW_CLASSES;

  const addressInput = hasStoreValues ? form.address.trim() : (profile.address ?? "").trim();
  const addressValidation = validateZcashAddress(addressInput);
  const addressReadyForVerification =
    !!addressInput &&
    addressValidation.valid &&
    addressValidation.type !== "tex" &&
    addressValidation.type !== "transparent";

  return (
    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <div className="w-full max-w-xl bg-transparent overflow-visible">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: activePageBackground }}
        >
          <div
            className="relative min-h-[560px] overflow-visible px-2 pb-3"
            style={{ backgroundColor: activePageBackground }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `radial-gradient(circle, ${previewDotColor} 1px, transparent 1px)`,
                backgroundSize: "12px 12px",
              }}
            />

            <div className="relative z-10 mx-auto w-full max-w-[460px]" style={{ marginTop: `${AVATAR_OVERLAP_Y + 8}px` }}>
              <VerifiedCardWrapper
                verifiedCount={(previewProfile.verified_links_count ?? 0) + (previewProfile.address_verified ? 1 : 0)}
                featured={!!previewProfile.featured}
                className="relative overflow-visible mx-auto p-5 text-center w-full"
                style={{
                  maxWidth: "100%",
                  backgroundColor: activeCardBackground,
                  color: activeCardText,
                }}
              >
                <div
                  className="pointer-events-none absolute -top-[2px] left-1/2 z-0 h-[6px] -translate-x-1/2 rounded-b-full"
                  style={{ width: `${AVATAR_BORDER_MASK_WIDTH}px`, backgroundColor: activeCardBackground }}
                  aria-hidden
                />

                <div
                  className="relative h-auto backface-hidden top-0 left-0 w-full rounded-2xl"
                  style={
                    {
                      backgroundColor: activeCardBackground,
                      color: activeCardText,
                      "--profile-hover-color": activeCardText,
                      "--profile-hover-bg": profileHoverBackgroundColor,
                    } as CSSProperties
                  }
                >
                  <div
                    className="absolute left-4 right-4 z-10 flex items-center justify-between"
                    style={{ top: `${ACTION_BUTTONS_TOP}px` }}
                  >
                    <ProfileCardActions
                      profile={previewProfile}
                      hasAwards={hasAwards}
                      showStats={showStats}
                      onToggleStats={() => setShowStats((prev) => !prev)}
                      onEdit={() => {}}
                      onVerify={() => {}}
                      onCreatePrefillUrl={() => {}}
                    />
                  </div>

                  <div
                    className="absolute left-1/2 top-0 z-20"
                    style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px))` }}
                  >
                    <ProfileAvatar
                      profile={previewProfile}
                      size={AVATAR_SIZE}
                      imageClassName="object-contain"
                      className="mx-auto shadow-xs flex items-center justify-center"
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
                          const rank = previewProfile[`rank_${period}`];
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
                      /{formatUsername(previewProfile)}
                    </div>
                  </div>

                  {previewProfile.bio?.trim() && (
                    <p
                      className="mt-1 text-sm text-center max-w-[90%] mx-auto whitespace-pre-line break-words"
                      style={{ color: cardSecondaryTextColor }}
                    >
                      {previewProfile.bio}
                    </p>
                  )}

                  <p
                    className="mt-3 text-xs flex flex-wrap justify-center gap-x-1 gap-y-0.5"
                    style={{ color: cardSubtleTextColor }}
                  >
                    {previewProfile.nearest_city_name && (
                      <>
                        <span className="whitespace-nowrap">Near {previewProfile.nearest_city_name}</span>
                        <span className="opacity-70" aria-hidden>{"\u2022"}</span>
                      </>
                    )}
                    <span className="whitespace-nowrap">
                      Joined {new Date(previewProfile.joined_at || previewProfile.created_at || previewProfile.since || new Date().toISOString()).toLocaleString("default", { month: "short", year: "numeric" })}
                    </span>
                    {previewProfile.address_verified === true && (
                      <>
                        <span className="opacity-70" aria-hidden>{"\u2022"}</span>
                        <span className="whitespace-nowrap">Active {getLastVerifiedLabel(previewProfile.last_verified_at || previewProfile.last_verified)}</span>
                      </>
                    )}
                  </p>

                  {previewProfile.address ? (
                    <div className="mt-2 flex items-center justify-center">
                      <div
                        className="relative overflow-hidden flex items-center gap-2 border font-mono text-sm rounded-full px-3 py-1.5 shadow-inner w-fit max-w-[90%]"
                        style={{
                          color: cardSecondaryTextColor,
                          borderColor: cardSurfaceBorderColor,
                          backgroundColor: cardSurfaceColor,
                        }}
                      >
                        <span className="pointer-events-none absolute left-[6%] right-[6%] top-0 h-[5px] rounded-full bg-linear-to-b from-gray-200/55 to-transparent" aria-hidden />
                        <span className="select-all" title={previewProfile.address}>
                          {previewProfile.address.slice(0, 6)}...{previewProfile.address.slice(-6)}
                        </span>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {}}
                            className="group flex items-center justify-center hover:text-[var(--color-brand-blue)] hover:text-[var(--profile-hover-color)] transition-all px-1 overflow-hidden"
                            style={{ color: cardSubtleTextColor }}
                            title="Show QR"
                          >
                            QR
                          </button>
                          <CopyButton text={previewProfile.address} label="Copy" copiedLabel="Copied" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm italic" style={{ color: cardSubtleTextColor }}>-</p>
                  )}

                  <div
                    className="relative flex flex-col items-center w-full mx-auto transition-all overflow-hidden mt-5 pb-0"
                    style={{ maxWidth: "448px" }}
                  >
                    <div className="w-full text-sm transition-all duration-300 overflow-hidden" style={{ color: cardSecondaryTextColor }}>
                      <div className="px-4 pt-2 pb-3 bg-transparent flex flex-col gap-2">
                        {linksArray.length > 0
                          ? linksArray.map((link) => (
                            <ProfileLinkRow
                              key={link.id || link.url}
                              link={link}
                              classes={linkRowClasses}
                            />
                          ))
                          : <p className="italic text-center" style={{ color: cardSubtleTextColor }}>No contributed links yet.</p>}
                      </div>
                    </div>
                  </div>

                  {warningConfig && <ProfileCardWarning config={warningConfig} />}
                </div>
              </VerifiedCardWrapper>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 overflow-x-auto scrollbar-visible bg-white/85">
            <div className="px-1 pb-1">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">Card Foreground</p>
              <div className="min-w-max flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => updateField("profile_card_theme", "")}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                  aria-label="Reset card foreground theme"
                  title="Reset card foreground"
                >
                  <span
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${selectedCardThemeId ? "scale-100" : "scale-110"}`}
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, #ffffff, #ffffff 6px, #e5e7eb 6px, #e5e7eb 12px)",
                      borderColor: selectedCardThemeId ? "rgba(17,24,39,0.15)" : "#111827",
                      boxShadow: selectedCardThemeId ? "none" : "0 0 0 3px rgba(17,24,39,0.12)",
                    }}
                  />
                  <span className="text-[11px] font-medium text-gray-600">Reset</span>
                </button>
                {PROFILE_CARD_THEMES.map((theme) => {
                  const selected = theme.id === selectedCardThemeId;
                  return (
                    <button
                      key={`fg-${theme.id}`}
                      type="button"
                      onClick={() => updateField("profile_card_theme", theme.id)}
                      className="flex flex-col items-center gap-1.5 shrink-0"
                      aria-label={`Select ${theme.label} card theme`}
                      title={theme.label}
                    >
                      <span
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${selected ? "scale-110" : "scale-100"}`}
                        style={{
                          backgroundColor: theme.background,
                          borderColor: selected ? "#111827" : "rgba(17,24,39,0.15)",
                          boxShadow: selected ? "0 0 0 3px rgba(17,24,39,0.12)" : "none",
                        }}
                      />
                      <span className="text-[11px] font-medium text-gray-600">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 overflow-x-auto scrollbar-visible bg-white/85">
            <div className="px-1 pb-1">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">Page Background</p>
              <div className="min-w-max flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => updateField("profile_page_bkgd", "")}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                  aria-label="Reset page background"
                  title="Reset page background"
                >
                  <span
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${selectedPageBackgroundId ? "scale-100" : "scale-110"}`}
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, #faf6ed, #faf6ed 6px, #e5e7eb 6px, #e5e7eb 12px)",
                      borderColor: selectedPageBackgroundId ? "rgba(17,24,39,0.15)" : "#111827",
                      boxShadow: selectedPageBackgroundId ? "none" : "0 0 0 3px rgba(17,24,39,0.12)",
                    }}
                  />
                  <span className="text-[11px] font-medium text-gray-600">Reset</span>
                </button>
                {PROFILE_CARD_THEMES.map((theme) => {
                  const selected = theme.id === selectedPageBackgroundId;
                  return (
                    <button
                      key={`bg-${theme.id}`}
                      type="button"
                      onClick={() => updateField("profile_page_bkgd", theme.id)}
                      className="flex flex-col items-center gap-1.5 shrink-0"
                      aria-label={`Select ${theme.label} page background`}
                      title={theme.label}
                    >
                      <span
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${selected ? "scale-110" : "scale-100"}`}
                        style={{
                          backgroundColor: theme.background,
                          borderColor: selected ? "#111827" : "rgba(17,24,39,0.15)",
                          boxShadow: selected ? "0 0 0 3px rgba(17,24,39,0.12)" : "none",
                        }}
                      />
                      <span className="text-[11px] font-medium text-gray-600">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 bg-white/85">
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  if (!addressReadyForVerification) return;
                  onGenerateQr?.();
                }}
                disabled={!addressReadyForVerification}
                className="hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Start Verification
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
