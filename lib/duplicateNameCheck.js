const normalizedName = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ /g, "_");

/**
 * Checks whether a profile's name is duplicated among cached profiles.
 * Falls back to several possible server-side count fields on the profile object.
 */
export function checkDuplicateNames(profile, cachedProfiles) {
  const duplicateNameCountFromProfile =
    typeof profile.duplicate_name_count === "number"
      ? profile.duplicate_name_count
      : typeof profile.name_duplicate_count === "number"
        ? profile.name_duplicate_count
        : typeof profile.duplicate_names_count === "number"
          ? profile.duplicate_names_count
          : typeof profile.name_duplicates_count === "number"
            ? profile.name_duplicates_count
            : null;

  const computedDuplicateNameCount =
    Array.isArray(cachedProfiles) && profile?.name
      ? cachedProfiles.filter(
          (p) => normalizedName(p?.name) === normalizedName(profile.name)
        ).length
      : null;

  const duplicateNameCount =
    duplicateNameCountFromProfile ?? computedDuplicateNameCount ?? 0;

  const hasDuplicateNames = duplicateNameCount > 1;

  return { duplicateNameCount, hasDuplicateNames };
}
