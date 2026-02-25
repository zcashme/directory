// Shared reward-program constants, helpers, and types used by
// getLeaderboardAction.ts and getReferrerStatsAction.ts.

// ============================================
// REWARD PROGRAM CONSTANTS
// ============================================

// Eligibility & Duration
export const ELIGIBILITY_WINDOW_WEEKS = 4; // R = weeks after signup to verify for eligibility
export const REWARD_DURATION_MONTHS = 12; // T = months rewards are paid after verification

// Base Commission
export const BASE_COMMISSION_RATE = 0.3; // Base X% = 30% commission
export const VERIFICATION_FEE_ZEC = 0.001; // Fixed fee per verification (in ZEC)

// Authenticated Links Multiplier (Option A: Linear Increment)
export const COMMISSION_DELTA_PER_LINK = 0.05; // 5% increase per authenticated link
export const MAX_COMMISSION_RATE = 0.5; // Cap at 50%

// ============================================
// TYPES
// ============================================

export type CommissionTier = "base" | "bronze" | "silver" | "gold" | "platinum";

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
 * Calculate commission rate based on authenticated links count.
 * Uses linear increment model: base_rate + (authenticated_links * delta)
 */
export function calculateCommissionRate(verifiedLinksCount: number): number {
  const rate = BASE_COMMISSION_RATE + verifiedLinksCount * COMMISSION_DELTA_PER_LINK;
  return Math.min(rate, MAX_COMMISSION_RATE);
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
