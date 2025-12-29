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
      p.name?.toLowerCase().includes(q) ||
      p.link_search_text?.includes(q) ||
      (p.address && addr === p.address)
    )
    : [];

  const prioritized = q
    ? filtered
      .map((p, index) => {
        const name = p.name?.toLowerCase() || "";
        const linkSearch = p.link_search_text || "";
        const nameStarts = name.startsWith(q);
        const linkStarts = linkSearch.startsWith(q);
        const nameIncludes = name.includes(q);
        const linkIncludes = linkSearch.includes(q);
        const addressExact = p.address && addr === p.address;
        let score = 4;

        if (nameStarts) score = 0;
        else if (linkStarts) score = 1;
        else if (nameIncludes) score = 2;
        else if (linkIncludes) score = 3;
        else if (addressExact) score = 4;

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

    setShow(true);
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
          className="w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400"
        />
      )}

      {/* Dropdown menu */}
      {show && value && (
        <div
          onMouseEnter={() => {
            setIsHovering(true);
            clearHideTimer();
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            startHideTimer();
          }}
          className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#0a1126]/80 bg-[#0a1126]/90 backdrop-blur-md shadow-xl w-full"
        >
          {prioritized.length > 0 ? (
            prioritized.slice(0, 20).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p);
                  if (p.address) setSelectedAddress(p.address);
                  setShow(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-white font-semibold hover:bg-[#060b17]/95 transition-colors"
              >
                {/* Avatar */}
                <ProfileAvatar
                  profile={p}
                  size={32}
                  imageClassName="object-cover"
                />

                {/* Text + metadata */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="truncate flex-shrink-0">
                    {p.name}
                  </span>

                  {(p.address_verified ||
                    p.zcasher_links?.some((l) => l.is_verified)) && (
                      <VerifiedBadge profile={p} />
                    )}

                  {p.address && (
                    <span className="text-xs opacity-60 whitespace-nowrap truncate max-w-[120px] flex-shrink">
                      {p.address.slice(0, 6)}...{p.address.slice(-6)}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-white/90 font-medium">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
