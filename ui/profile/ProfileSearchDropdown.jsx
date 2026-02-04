import { useState, useEffect, useRef } from "react";
import { searchProfiles } from "@/lib/directory/searchProfiles";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ProfileSearchDropdown({
  value,
  onChange,
  placeholder = "Search",
  listOnly = false,
  showByDefault = true,
  className = "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-blue-500 text-gray-800 placeholder-gray-400",
  ...props
}) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const hideTimerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  const debouncedQuery = useDebounce(value, 50);

  const clearHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isHovering) setShow(false);
    }, 4000);
  };

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    searchProfiles(debouncedQuery, 3)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Show/hide dropdown based on value
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
  }, [value, isHovering, showByDefault]);

  // Handle click outside
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
          className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white backdrop-blur-md shadow-xl w-full"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-800 font-medium">
              Searching...
            </div>
          ) : results.length > 0 ? (
            results.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p);
                  setShow(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-gray-800 font-semibold hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <ProfileAvatar
                  profile={p}
                  size={32}
                  imageClassName="object-cover"
                />

                {/* Text + metadata */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="truncate shrink-0">
                    {p.display_name || p.name}
                  </span>

                  {(p.address_verified ||
                    p.zcasher_links?.some((l) => l.is_verified)) && (
                      <VerifiedBadge profile={p} />
                    )}

                  <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                    @{p.name}
                  </span>
                </div>
              </div>
            ))
          ) : value.length < 2 ? (
            <div className="px-3 py-2 text-sm text-gray-800 font-medium">
              Type at least 2 characters
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-800 font-medium">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
