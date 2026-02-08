import type { Profile } from "@/types/index";

export { normalizeSlug } from "@/lib/profile/profileUtils";
export { getLastVerifiedLabel } from "@/lib/profile/profileUtils";

export const isTruthyFlag = (value: boolean | string | number | undefined | null): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

export const isNsProfile = (profile: Profile | undefined): boolean =>
  isTruthyFlag(profile?.is_ns);

export const hasRank = (profile: Profile | undefined): boolean =>
  ["alltime", "weekly", "monthly", "daily"].some(
    (period) => Number(profile?.[`rank_${period}` as keyof Profile]) > 0
  );

export const isVerifiedProfile = (profile: Profile | undefined): boolean =>
  Boolean(profile?.address_verified) ||
  Number(profile?.verified_links_count || 0) > 0 ||
  Boolean(profile?.links?.some((link) => link.is_verified));

export const getProfileLocation = (profile: Profile | undefined): string =>
  profile?.nearest_city_name || "";

export const getCountryFlag = (country: string = ""): string => {
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

export const getCountryName = (profile: Profile | undefined): string =>
  (profile?.country || "").trim();

export const getProfileTags = (profile: Profile | undefined): string[] => {
  const tags: string[] = [];
  if (isVerifiedProfile(profile)) tags.push("Verified");
  if (hasRank(profile)) tags.push("Top Rank");
  if (isTruthyFlag(profile?.is_ns_core)) tags.push("Core");
  if (isTruthyFlag(profile?.is_ns_longterm)) tags.push("Long-term");
  return tags;
};

