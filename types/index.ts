// Core domain models for the Zcash Directory application

/**
 * Core profile entity from the zcasher_searchable table
 */
export interface Profile {
  id: number;
  name: string; // Username (normalized)
  display_name?: string; // Display name (different from username)
  slug?: string; // URL-friendly identifier
  bio?: string; // Profile bio/description (max 100 chars)
  address: string; // Zcash address
  address_verified: boolean; // Verified via address ownership
  nearest_city_id?: number | null; // Foreign key to city
  nearest_city_name?: string; // Display name of city
  avatar_url?: string; // Profile avatar image URL
  links?: ProfileLink[]; // Array of social/web links
  verified_links_count?: number; // Count of verified links
  total_links?: number; // Total number of links
  since?: string; // ISO date of profile creation
  last_verified_at?: string; // ISO date of last verification

  // Ranking fields (from ranking tables)
  rank_alltime?: number; // All-time referrer rank (0 if not ranked)
  rank_weekly?: number; // Weekly referrer rank (0 if not ranked)
  rank_monthly?: number; // Monthly referrer rank (0 if not ranked)
  rank_daily?: number; // Daily referrer rank (0 if not ranked)
}

/**
 * Derived profile trust/verification state
 */
export interface ProfileTrust {
  verifiedAddress: boolean; // address_verified = true
  verifiedLinks: number; // Count of is_verified links
  hasVerifiedContent: boolean; // Either address or links verified
  isVerified: boolean; // Alias for hasVerifiedContent
  canAuthenticateLinks: boolean; // Can only auth links if address verified
}

/**
 * Profile trust warning structure
 */
export interface ProfileTrustWarning {
  tone: "red" | "yellow" | "positive" | "neutral";
  summary: string; // User-facing warning title
  toggleLabel: string; // "Warnings" | "More" | "Caution"
  defaultExpanded?: boolean;
  details: string[]; // Array of warning reasons
}

/**
 * Profile link entity
 */
export interface ProfileLink {
  id?: number | null;
  url: string; // Full URL (e.g., https://x.com/handle)
  label?: string; // Custom label, may be username
  is_verified: boolean; // Link ownership verified
  verification_expires_at?: string; // ISO date when verification expires
  zcasher_id?: number; // Profile ID (when used in batch results)
}

import type { StaticImageData } from "next/image";

/**
 * Enriched profile link with computed metadata
 */
export interface EnrichedProfileLink extends ProfileLink {
  icon: StaticImageData | string; // Image/icon path or StaticImageData from next/image
  label: string; // Computed display label (non-optional)
  domain?: string; // Extracted domain
  handle?: string; // Extracted username from URL
  platform?: "X" | "GitHub" | "Instagram" | "Discord" | null;
}

/**
 * Profile links collection
 */
export interface ProfileLinks {
  linksArray: EnrichedProfileLink[]; // Enriched link array
  totalLinks: number; // Total link count (may differ from array length)
}

/**
 * Link verification update payload
 */
export interface LinkVerificationPayload {
  is_verified: boolean;
  verification_expires_at?: string | null;
  [key: string]: unknown;
}

/**
 * City entity
 */
export interface City {
  id: number;
  city: string; // City name (original case)
  city_ascii: string; // ASCII normalized city name
  admin_name: string; // State/province name
  country: string; // Country name or code
}

/**
 * Token entity for cryptocurrency swaps
 */
export interface Token {
  id?: string;
  assetId?: string; // Alternative ID field
  tokenId?: string; // Alternative ID field
  asset?: string; // Alternative ID field (used as fallback)
  symbol: string; // Token symbol (e.g., "ZEC", "BTC", "ETH")
  ticker?: string; // Alternative symbol field
  decimals: number; // Decimal places (0-30)
  blockchain: string; // Blockchain name (e.g., "ZEC.mainnet", "Bitcoin.mainnet")
  [key: string]: unknown; // Additional provider-specific fields
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
