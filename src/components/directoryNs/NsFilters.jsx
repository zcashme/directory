import allIcon from "../../assets/favicons/network-state-plus-flag-avatar-logo-black.png";
import coreIcon from "../../assets/favicons/network-state-plus-flag-avatar-logo-core-team.png";
import longTermIcon from "../../assets/favicons/network-state-plus-flag-avatar-logo-long-term.png";
import discordFavicon from "../../assets/favicons/favicon-discord-32.png";
import { FILTER_BASE, FILTER_CONTENT } from "../../styles/directoryNsStyles";

const getFilterButtonClass = (active, activeClass, hoverClass) => {
  const scopedHoverClass = hoverClass.replace(/hover:/g, "md:hover:");
  return `${FILTER_BASE} md:hover:scale-[1.03] ${
    active ? activeClass : "bg-white"
  } ${scopedHoverClass}`;
};

export default function NsFilters({
  anyFilterActive,
  clearFilters,
  filters,
  toggleFilter,
  nsCount,
  verifiedCount,
  coreCount,
  longtermCount,
  rankedCount,
  onOpenLocationFilter,
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
        <button
          type="button"
          onClick={clearFilters}
          className={getFilterButtonClass(!anyFilterActive, "bg-blue-300", "hover:bg-blue-200")}
        >
          <span className={FILTER_CONTENT}>
            <img src={allIcon?.src || allIcon} alt="All" className="h-4 w-auto" />
            All ({nsCount})
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("verified")}
          className={getFilterButtonClass(filters.verified, "bg-green-300", "hover:bg-green-200")}
        >
          <span className={FILTER_CONTENT}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="48 36 160 200"
              className="h-5 w-4"
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
            Verified ({verifiedCount})
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("core")}
          className={getFilterButtonClass(filters.core, "bg-[#f6b223]", "hover:bg-[#f6b223]")}
        >
          <span className={FILTER_CONTENT}>
            <img src={coreIcon?.src || coreIcon} alt="Core" className="h-4 w-auto" />
            Core ({coreCount})
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("longterm")}
          className={getFilterButtonClass(filters.longterm, "bg-[#16b364]", "hover:bg-[#16b364]")}
        >
          <span className={FILTER_CONTENT}>
            <img
              src={longTermIcon?.src || longTermIcon}
              alt="Long-Term"
              className="h-4 w-auto"
            />
            Long-Term ({longtermCount})
          </span>
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleFilter("ranked")}
            className={getFilterButtonClass(filters.ranked, "bg-orange-300", "hover:bg-orange-200")}
          >
            <span className={FILTER_CONTENT}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
                className="h-5 w-auto"
                aria-hidden="true"
              >
                <path
                  d="M128 28 L156 92 L224 100 L172 146 L186 216 L128 180 L70 216 L84 146 L32 100 L100 92 Z"
                  fill="#000000"
                />
              </svg>
              Top Rank ({rankedCount})
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenLocationFilter}
            className={getFilterButtonClass(false, "bg-white", "hover:bg-orange-200")}
          >
            <span className={FILTER_CONTENT}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              Location
            </span>
          </button>
        </div>
      </div>
      <a
        href="https://discord.com/channels/900827411917201418/1454104981320892591"
        target="_blank"
        rel="noopener noreferrer"
        className="border border-gray-900 px-3 py-2 text-xs font-semibold uppercase transition-transform duration-150 hover:scale-[1.03] rounded-none sm:ml-auto"
      >
        <span className="flex w-full items-center justify-center gap-2 text-center">
          <img src={discordFavicon?.src || discordFavicon} alt="Discord" className="h-4 w-auto" />
          Join the Discord
        </span>
      </a>
    </div>
  );
}
