import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";
import { FALLBACK_ICON } from "@/lib/profile/profileLinks";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";

export const formatUsername = (profile: Partial<Profile>) =>
  getUsernameWithDiscriminator(profile).replace(/\s+/g, "_");

export const resolveIconSrc = (icon?: EnrichedProfileLink["icon"]) =>
  (typeof icon === "string" ? icon : icon?.src) ||
  (typeof FALLBACK_ICON === "string" ? FALLBACK_ICON : FALLBACK_ICON?.src) ||
  "";

export const isTruthyProfileFlag = (value: boolean | string | number | undefined | null): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
};
