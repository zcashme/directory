import coreIcon from "../../assets/favicons/network-state-plus-flag-avatar-logo-core-team.png";
import longTermIcon from "../../assets/favicons/network-state-plus-flag-avatar-logo-long-term.png";

export default function TagBadges({ tags = [], idPrefix = "" }) {
  if (!tags.length) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {tags.map((tag) => (
        <span key={`${idPrefix}${tag}`} title={tag} className="flex items-center">
          {tag === "Verified" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="48 36 160 200"
              className="h-4 w-3 block"
              aria-hidden="true"
            >
              <path
                d="M56 70 C86 78, 108 74, 128 52 C148 74, 170 78, 200 70 V128 C200 172, 164 206, 128 224 C92 206, 56 172, 56 128 Z"
                fill="#2f7d4c"
              />
              <path
                d="M96 126 L118 148 L162 104"
                fill="none"
                stroke="#ffffff"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {tag === "Top Rank" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className="h-4 w-4 block"
              aria-hidden="true"
            >
              <path
                d="M128 28 L156 92 L224 100 L172 146 L186 216 L128 180 L70 216 L84 146 L32 100 L100 92 Z"
                fill="#000000"
              />
            </svg>
          )}
          {tag === "Core" && (
            <img src={coreIcon?.src || coreIcon} alt="Core" className="h-4 w-auto" />
          )}
          {tag === "Long-term" && (
            <img
              src={longTermIcon?.src || longTermIcon}
              alt="Long-term"
              className="h-4 w-auto"
            />
          )}
        </span>
      ))}
    </div>
  );
}
