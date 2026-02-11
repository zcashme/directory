import type { EnrichedProfileLink } from "@/lib/profile/types";
import { FALLBACK_ICON } from "@/lib/profile/profileLinks";

export const formatUsername = (value = "") => value.trim().replace(/\s+/g, "_");

export const resolveIconSrc = (icon?: EnrichedProfileLink["icon"]) =>
  (typeof icon === "string" ? icon : icon?.src) ||
  (typeof FALLBACK_ICON === "string" ? FALLBACK_ICON : FALLBACK_ICON?.src) ||
  "";
