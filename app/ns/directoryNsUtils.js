export { normalizeSlug } from "@/lib/profile/normalizeSlugs";
export { getLastVerifiedLabel } from "@/lib/profile/profileUtils";

export const isTruthyFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

export const isNsProfile = (profile) => isTruthyFlag(profile?.is_ns);

export const hasRank = (profile) =>
  ["alltime", "weekly", "monthly", "daily"].some(
    (period) => Number(profile?.[`rank_${period}`]) > 0
  );

export const isVerifiedProfile = (profile) =>
  Boolean(profile?.address_verified) ||
  Number(profile?.verified_links_count || 0) > 0 ||
  Boolean(profile?.links?.some((link) => link.is_verified));

export const getProfileLocation = (profile) => profile?.nearest_city_name || "";

export const getCountryFlag = (country = "") => {
  const code = country.trim().toUpperCase();
  if (code.length !== 2) return "";
  const base = 0x1f1e6;
  const chars = code.split("");
  if (chars.some((ch) => ch < "A" || ch > "Z")) return "";
  return String.fromCodePoint(
    base + (chars[0].charCodeAt(0) - 65),
    base + (chars[1].charCodeAt(0) - 65)
  );
};

export const getCountryName = (profile) => (profile?.country || "").trim();

export const getProfileTags = (profile) => {
  const tags = [];
  if (isVerifiedProfile(profile)) tags.push("Verified");
  if (hasRank(profile)) tags.push("Top Rank");
  if (isTruthyFlag(profile?.is_ns_core)) tags.push("Core");
  if (isTruthyFlag(profile?.is_ns_longterm)) tags.push("Long-term");
  return tags;
};

