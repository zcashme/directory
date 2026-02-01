/**
 * Converts a verification timestamp to a human-readable "time ago" string.
 */
export function getVerifiedTimeAgo(timestamp) {
  if (!timestamp) return "N/A";
  const ts = new Date(timestamp).getTime();
  const weeks = (Date.now() - ts) / (1000 * 60 * 60 * 24 * 7);

  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
}
