export const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

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

export const getLastVerifiedLabel = (profile) => {
  if (profile?.last_verified_label) return profile.last_verified_label;
  const ts = profile?.last_verified_at || profile?.last_verified;
  if (!ts) return "n/a";
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return "n/a";
  const weeks = (Date.now() - ms) / (1000 * 60 * 60 * 24 * 7);
  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
};

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

export const getTagLabel = (tag) => (tag.startsWith("NS v") ? "NS v" : tag);

export const normalizeProfile = (profile = {}) => {
  const displayName = profile?.display_name || profile?.name || "Unnamed";
  const profileSlug = normalizeSlug(profile?.name || profile?.display_name || "");
  const address = profile?.address || "";
  const addressDisplay = address
    ? address.length > 24
      ? `${address.slice(0, 8)}...${address.slice(-8)}`
      : address
    : "-";
  const locationDisplay = getProfileLocation(profile);

  return {
    ...profile,
    displayName,
    profileSlug,
    addressDisplay,
    locationDisplay,
  };
};
