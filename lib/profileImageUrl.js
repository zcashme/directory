/**
 * Appends a cache-busting query param to profile image URLs.
 * Skips Twitter avatar URLs (pbs.twimg.com) and URLs that already have query params.
 */
export function getProfileImageUrl(profile) {
  const rawUrl = profile.profile_image_url || "";
  const isTwitter = rawUrl.includes("pbs.twimg.com");

  if (isTwitter) return rawUrl;
  if (rawUrl.includes("?")) return rawUrl;
  return `${rawUrl}?v=${profile.last_signed_at || profile.created_at}`;
}
