import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";
import { FALLBACK_ICON } from "@/lib/profile/profileLinks";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";

export const formatUsername = (profile: Partial<Profile>) =>
  getUsernameWithDiscriminator(profile).replace(/\s+/g, "_");

export const resolveIconSrc = (icon?: EnrichedProfileLink["icon"]) =>
  (typeof icon === "string" ? icon : icon?.src) ||
  (typeof FALLBACK_ICON === "string" ? FALLBACK_ICON : FALLBACK_ICON?.src) ||
  "";
