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
  nearest_city_name?: string;
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
  is_maxi?: boolean;
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
  platform?: string | null;
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
  platform?: string | null;
}

/**
 * Profile links collection
 */
export interface ProfileLinks {
  linksArray: EnrichedProfileLink[];
  totalLinks: number;
}

