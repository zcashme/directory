// Shared reward-program constants, helpers, and types used by
// getLeaderboardAction.ts and getReferrerStatsAction.ts.

// ============================================
// REWARD PROGRAM CONSTANTS
// ============================================

// Eligibility & Duration
export const ELIGIBILITY_WINDOW_WEEKS = 4; // R = weeks after signup to verify for eligibility
export const REWARD_DURATION_MONTHS = 12; // T = months rewards are paid after verification

// Base Commission
export const BASE_COMMISSION_RATE = 0.15; // Base 15% commission
export const VERIFICATION_FEE_ZEC = 0.001; // Fixed fee per verification (in ZEC)

// Profile Completeness Bonus
export const PROFILE_COMPLETENESS_BONUS = 0.05; // 5% per completed profile field (picture, bio, location)

// Authenticated Links Multiplier (Linear Increment)
export const COMMISSION_DELTA_PER_LINK = 0.10; // 10% increase per authenticated link
export const MAX_COMMISSION_RATE = 0.5; // Cap at 50%

// ============================================
// TYPES
// ============================================

export type CommissionTier = "base" | "bronze" | "silver" | "gold" | "platinum";
export type ReferralStatus = "eligible" | "active" | "expired" | "ineligible";

// ============================================
// HELPER FUNCTIONS
// ============================================

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function monthsBetween(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate commission rate based on profile completeness and authenticated links.
 * Formula: base (15%) + profile bonuses (5% each for picture, bio, location) + links (10% each), capped at 50%.
 */
export function calculateCommissionRate(opts: {
  verifiedLinksCount: number;
  hasProfileImage: boolean;
  hasBio: boolean;
  hasLocation: boolean;
}): number {
  let rate = BASE_COMMISSION_RATE;
  if (opts.hasProfileImage) rate += PROFILE_COMPLETENESS_BONUS;
  if (opts.hasBio) rate += PROFILE_COMPLETENESS_BONUS;
  if (opts.hasLocation) rate += PROFILE_COMPLETENESS_BONUS;
  rate += opts.verifiedLinksCount * COMMISSION_DELTA_PER_LINK;
  return Math.min(rate, MAX_COMMISSION_RATE);
}

/**
 * Determine referral status based on verification timing.
 */
export function computeReferralStatus(
  addressVerified: boolean,
  createdAt: Date,
  firstVerifiedAt: Date | null,
  now: Date,
): ReferralStatus {
  const eligibilityDeadline = addWeeks(createdAt, ELIGIBILITY_WINDOW_WEEKS);

  // Verified AND verified within the 4-week window → activated
  if (addressVerified && firstVerifiedAt && firstVerifiedAt <= eligibilityDeadline) {
    const rewardEnd = addMonths(firstVerifiedAt, REWARD_DURATION_MONTHS);
    return now < rewardEnd ? "active" : "expired";
  }

  // Still within the 4-week window → eligible (can still activate)
  if (now < eligibilityDeadline) return "eligible";

  // 4-week window passed without valid verification
  return "ineligible";
}

/**
 * Determine commission tier based on verified links count.
 */
export function getCommissionTier(verifiedLinksCount: number): CommissionTier {
  if (verifiedLinksCount >= 10) return "platinum";
  if (verifiedLinksCount >= 6) return "gold";
  if (verifiedLinksCount >= 3) return "silver";
  if (verifiedLinksCount >= 1) return "bronze";
  return "base";
}
