export default function VerifiedCardWrapper({
  verifiedCount = 0, // still accepts prop from ProfileCard (now mapped to verified_links_count)
  featured = false, // new flag
  onClick,
  className = "",
  children,
}) {
  // Base style tiers
  const baseStyle =
    "rounded-2xl p-3 border transition-all cursor-pointer shadow-xs";

  let tierStyle;

  if (featured) {
    // Featured glow takes priority
    tierStyle =
      "border-yellow-400 bg-yellow-50/40 hover:bg-yellow-50/60 hover:shadow-[0_0_10px_rgba(250,204,21,0.4)]";
  } else if (verifiedCount >= 3) {
    tierStyle =
      "border-green-400 bg-linear-to-r from-green-50/80 via-emerald-50/80 to-green-100/80 relative overflow-hidden";
  } else if (verifiedCount === 2) {
    tierStyle =
      "border-green-400 bg-green-50/60 hover:bg-green-50 hover:shadow-[0_0_10px_rgba(34,197,94,0.25)]";
  } else if (verifiedCount === 1) {
    tierStyle =
      "border-blue-300 bg-blue-50/60 hover:bg-blue-50 hover:shadow-[0_0_8px_rgba(59,130,246,0.25)]";
  } else {
    tierStyle =
      "border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)]";
  }

  return (
    <div
      onClick={onClick}
      className={`${baseStyle} ${tierStyle} verified-card-hover ${className}`}
    >
      {/* Animated gradient shimmer for top-tier verified */}
      {verifiedCount >= 3 && !featured && (
        <div
          className="absolute inset-0 rounded-2xl bg-linear-to-r from-green-300/10 via-emerald-400/20 to-green-300/10 blur-md verified-card-shimmer"
          style={{
            zIndex: 0,
          }}
        />
      )}

      {/* Foreground content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
