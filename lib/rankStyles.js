/**
 * Derives the highest-priority rank type from a profile.
 */
export function getRankType(profile) {
  if (profile.rank_alltime > 0) return "alltime";
  if (profile.rank_weekly > 0) return "weekly";
  if (profile.rank_monthly > 0) return "monthly";
  if (profile.rank_daily > 0) return "daily";
  return null;
}

/**
 * Returns a Tailwind class string for the profile circle indicator.
 */
export function getCircleClass(isVerified, rankType) {
  if (isVerified && rankType) {
    return "bg-gradient-to-r from-green-400 to-orange-500";
  }
  if (isVerified) {
    return "bg-green-500";
  }
  if (rankType) {
    const map = {
      alltime: "bg-gradient-to-r from-blue-500 to-red-500",
      weekly: "bg-gradient-to-r from-blue-500 to-orange-500",
      monthly: "bg-gradient-to-r from-blue-500 to-red-500",
      daily: "bg-gradient-to-r from-blue-500 to-cyan-500",
    };
    return map[rankType] || "bg-blue-500";
  }
  return "bg-blue-500";
}
