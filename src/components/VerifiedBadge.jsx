export default function VerifiedBadge({ verified = true, verifiedCount = 1 }) {
  const baseClasses =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none whitespace-nowrap align-middle";

  const checksToShow = Math.min(Math.max(verifiedCount, 1), 3); // clamp between 1–3

  // ✅ Updated checkmark path only (matches Copy Uaddr)
  const renderChecks = (color) => (
    <span className="relative flex -space-x-1">
      {[...Array(checksToShow)].map((_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 ${color} drop-shadow-sm`}
          style={{ zIndex: 3 - i }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ))}
    </span>
  );

  if (verified) {
    // ✅ Verified or partially verified
    return (
      <span
        className={`${baseClasses} text-green-800 bg-gradient-to-r from-green-100 to-green-200 border border-green-300 shadow-sm`}
        style={{ fontFamily: "inherit" }}
      >
        {renderChecks("text-green-600")}
        Verified
      </span>
    );
  }

  // ⚪ Unverified state
  return (
    <span
      className={`${baseClasses} text-gray-500 bg-gray-100 border border-gray-200 shadow-sm`}
      style={{ fontFamily: "inherit" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z" />
      </svg>
      Unverified
    </span>
  );
}
