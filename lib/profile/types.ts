import type { StaticImageData } from "next/image";

// Core domain models for the Zcash Directory application

/**
 * Core profile entity from the zcasher_searchable table
 */
export interface Profile {
  id: number;
  name: string;
  display_name?: string;
  slug?: string;
  bio?: string;
  address: string;
  address_verified: boolean;
  nearest_city_id?: number | null;
  nearest_city_name?: string;
  avatar_url?: string;
  profile_image_url?: string;
  links?: ProfileLink[];
  verified_links_count?: number;
  total_links?: number;
  since?: string;
  joined_at?: string;
  created_at?: string;
  last_verified_at?: string;
  last_verified?: string;
  featured?: boolean;
  rank_alltime?: number;
  rank_weekly?: number;
  rank_monthly?: number;
  rank_daily?: number;
  is_ns?: boolean | string | number;
  is_ns_core?: boolean | string | number;
  is_ns_longterm?: boolean | string | number;
  country?: string;
  iso2?: string;
  link_search_text?: string;
  last_verified_label?: string;
}

/**
 * Derived profile trust/verification state
 */
export interface ProfileTrust {
  verifiedAddress: boolean;
  verifiedLinks: number;
  hasVerifiedContent: boolean;
  isVerified: boolean;
  canAuthenticateLinks: boolean;
}

/**
 * Profile trust warning structure
 */
export interface ProfileTrustWarning {
  tone: "red" | "yellow" | "positive" | "neutral";
  summary: string;
  toggleLabel: string;
  defaultExpanded?: boolean;
  details: string[];
}

/**
 * Profile link entity
 */
export interface ProfileLink {
  id?: number | null;
  url: string;
  label?: string;
  is_verified: boolean;
  verification_expires_at?: string;
  zcasher_id?: number;
}

/**
 * Enriched profile link with computed metadata
 */
export interface EnrichedProfileLink extends ProfileLink {
  icon: StaticImageData | string;
  label: string;
  domain?: string;
  handle?: string;
  platform?: "X" | "GitHub" | "Instagram" | "Discord" | null;
}

/**
 * Profile links collection
 */
export interface ProfileLinks {
  linksArray: EnrichedProfileLink[];
  totalLinks: number;
}

/**
 * Link verification update payload
 */
export interface LinkVerificationPayload {
  is_verified: boolean;
  verification_expires_at?: string | null;
  [key: string]: unknown;
}

export interface PendingProfileChange {
  name?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  address?: string;
  c?: string;
  d?: string[];
  [key: string]: string | string[] | undefined;
}

export interface PendingEdits {
  profile?: PendingProfileChange;
  l?: string[];
}

/**
 * Rank type discriminator
 */
export type RankType = "alltime" | "weekly" | "monthly" | "daily" | null;

/**
 * Profile with ranking information
 */
export interface RankedProfile extends Profile {
  rank_alltime: number;
  rank_weekly: number;
  rank_monthly: number;
}

/**
 * Link enrichment input
 */
export interface LinkEnrichmentInput {
  url: string;
  label?: string;
}
