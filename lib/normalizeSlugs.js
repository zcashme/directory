export const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

export const buildSlug = (profile) => {
  if (!profile?.name) return "";
  const base = normalizeSlug(profile.name);
  if (!base) return "";
  if (profile.slug) return profile.slug;
  return profile.address_verified ? base : `${base}-${profile.id}`;
};

/**
 * Builds a full shareable URL for a profile using display_name/name + origin.
 */
export const buildShareUrl = (profile) => {
  const baseSlug = (profile.display_name || profile.name || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${profile.address_verified ? baseSlug : `${baseSlug}-${profile.id}`}`;
};
