import { useState, useEffect, useRef } from "react";
import { useFeedback } from "../hooks/useFeedback";
import VerifiedBadge from "./VerifiedBadge";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileSearchDropdown({
  value,
  onChange,
  profiles,
  placeholder = "Search",
  listOnly = false,
  showByDefault = true,
  onClaimClick = null,
  className = "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400",
  ...props
}) {
  const [show, setShow] = useState(false);
  const hideTimerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  const clearHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isHovering) setShow(false);
    }, 4000);
  };

  // This is the only global sync we need
  const { setSelectedAddress } = useFeedback();

  // -----------------------------
  // Normalizers
  // -----------------------------
  const normalizeSearch = (s = "") =>
    s
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?[^/]+\/?/, "")
      .trim();

  const q = normalizeSearch(value);
  const addr = value?.trim();

  // -----------------------------
  // Filtering
  // -----------------------------
  const filtered = q
    ? profiles.filter((p) =>
      p.display_name?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.link_search_text?.includes(q) ||
      (p.address && addr === p.address)
    )
    : [];

  const prioritized = q
    ? filtered
      .map((p, index) => {
        const displayName = p.display_name?.toLowerCase() || "";
        const name = p.name?.toLowerCase() || "";
        const linkSearch = p.link_search_text || "";
        const displayStarts = displayName.startsWith(q);
        const nameStarts = name.startsWith(q);
        const linkStarts = linkSearch.startsWith(q);
        const displayIncludes = displayName.includes(q);
        const nameIncludes = name.includes(q);
        const linkIncludes = linkSearch.includes(q);
        const addressExact = p.address && addr === p.address;
        let score = 4;

        if (displayStarts) score = 0;
        else if (nameStarts) score = 1;
        else if (linkStarts) score = 2;
        else if (displayIncludes) score = 3;
        else if (nameIncludes) score = 4;
        else if (linkIncludes) score = 5;
        else if (addressExact) score = 6;

        return { p, score, index };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.index - b.index;
      })
      .map(({ p }) => p)
    : filtered;

  useEffect(() => {
    if (!value) {
      setShow(false);
      return;
    }

    if (showByDefault) {
      setShow(true);
    }
    startHideTimer();

    return () => {
      clearHideTimer();
    };
  }, [value, isHovering]);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  return (
    <div ref={dropdownRef} className="w-full">
      {/* Input only if NOT list-only */}
      {!listOnly && (
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          {...props}
        />
      )}

      {/* Dropdown menu */}
      {show && value && (() => {
        // Check if exact username is available
        const exactMatch = profiles.find(p => p.name?.toLowerCase() === q);
        const isAvailable = q && !exactMatch && onClaimClick;

        return (
          <div
            onMouseEnter={() => {
              setIsHovering(true);
              clearHideTimer();
            }}
            onMouseLeave={() => {
              setIsHovering(false);
              startHideTimer();
            }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-[70vh] md:max-h-60 overflow-y-auto rounded-xl border-2 border-[#f5c542] bg-[#faf6ed] shadow-xl w-full"
          >
            {/* Claim Now option - always first when username is available */}
            {isAvailable && (
              <div
                onClick={() => {
                  onClaimClick(value);
                  setShow(false);
                }}
                className="px-3 py-3 md:py-2.5 text-sm cursor-pointer flex items-center gap-2 md:gap-3 font-medium hover:bg-[#22c55e]/20 active:bg-[#22c55e]/30 transition-colors border-b border-[#22c55e]/30 bg-[#22c55e]/10"
              >
                {/* Plus icon in circle */}
                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-[#22c55e]">
                      Claim "{value}"
                    </span>
                  </div>
                  <span className="text-xs text-[#22c55e]/70 md:ml-auto">
                    zcash.me/{value} is available!
                  </span>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-[#22c55e] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}

            {/* Profile results */}
            {prioritized.length > 0 ? (
              prioritized.slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p);
                    if (p.address) setSelectedAddress(p.address);
                    setShow(false);
                  }}
                  className="px-3 py-3 md:py-2.5 text-sm cursor-pointer flex items-center gap-2 md:gap-3 text-[#1a1a1a] font-medium hover:bg-[#f5c542]/20 active:bg-[#f5c542]/30 transition-colors border-b border-[#e5e5e5] last:border-b-0"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 md:w-8 md:h-8 rounded-full overflow-hidden ring-2 ring-[#22c55e]/50 shrink-0">
                    <ProfileAvatar
                      profile={p}
                      size={36}
                      imageClassName="object-cover w-full h-full"
                    />
                  </div>

                  {/* Text + metadata */}
                  <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm md:text-sm">
                        {p.display_name || p.name}
                      </span>

                      {(p.address_verified ||
                        p.zcasher_links?.some((l) => l.is_verified)) && (
                          <span className="w-4 h-4 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                    </div>

                    <span className="text-xs text-[#1a1a1a]/50 md:ml-auto">
                      @{p.name}
                    </span>
                  </div>
                </div>
              ))
            ) : !isAvailable ? (
              <div className="px-3 py-2 text-sm text-[#1a1a1a]/60 font-medium">
                No matches
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}
