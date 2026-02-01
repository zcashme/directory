/**
 * Derives trust-state booleans from a profile object.
 */
export function getProfileTrust(profile) {
  const verifiedAddress = !!profile.address_verified || !!profile.verified;

  const verifiedLinks =
    (typeof profile.verified_links === "number"
      ? profile.verified_links
      : typeof profile.verified_links_count === "number"
        ? profile.verified_links_count
        : null) ??
    (profile.links?.filter((l) => l.is_verified).length || 0);

  const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
  const isVerified = hasVerifiedContent;
  const canAuthenticateLinks = !!profile.address_verified;

  return { verifiedAddress, verifiedLinks, hasVerifiedContent, isVerified, canAuthenticateLinks };
}
