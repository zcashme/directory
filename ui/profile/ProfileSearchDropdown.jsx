import { useState, useEffect, useRef } from "react";
import { searchProfiles, checkUsernameExists } from "@/lib/directory/searchProfiles";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

// Keystroke debounce - immediate UI feedback
function useKeystrokeDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Search debounce - for actual API calls
function useSearchDebounce(value, delay) {
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
  onUsernameAvailable,
  className = "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-blue-500 text-gray-800 placeholder-gray-400",
  ...props
}) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const hideTimerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const searchActiveRef = useRef(false);
  const lastQueryRef = useRef("");
  const previousResultsRef = useRef([]);
  const usernameAvailableRef = useRef(null);

  // Dual debouncing: keystroke (10ms) for UI responsiveness, search (50ms) for API calls
  const keystrokeDebounced = useKeystrokeDebounce(value, 10);
  const searchDebounced = useSearchDebounce(value, 50);

  const clearHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isHovering) setShow(false);
    }, 4000);
  };

  // Check if previous results still match the query (to avoid unnecessary refreshes)
  // IMPORTANT: This only checks if we can reuse search results, NOT if we can skip availability checks
  const resultsStillMatch = (query, previousQuery, previousResults) => {
    if (!query || !previousQuery || previousResults.length === 0) return false;
    if (previousResults.length > 3) return false; // Only skip if <= 3 results

    // Only reuse results if the query hasn't changed
    if (query.toLowerCase() !== previousQuery.toLowerCase()) return false;

    const q = query.trim().toLowerCase();
    // Check if all previous results still match the query
    return previousResults.every((profile) => {
      const name = (profile.name || "").toLowerCase();
      const displayName = (profile.display_name || "").toLowerCase();
      return name.includes(q) || displayName.includes(q);
    });
  };

  // Server-side search with character-length-based filtering
  useEffect(() => {
    const query = searchDebounced?.trim();

    if (!query) {
      setResults([]);
      setLoading(false);
      usernameAvailableRef.current = null;
      setUsernameAvailable(null);
      onUsernameAvailable?.(null);
      searchActiveRef.current = false;
      lastQueryRef.current = "";
      previousResultsRef.current = [];
      return;
    }

    // If query matches the last query exactly and results still match, we can reuse results
    // BUT we ALWAYS need to check availability because:
    // 1. The query might have changed from a different available username
    // 2. Database state might have changed (someone claimed the username)
    const canReuseResults = resultsStillMatch(query, lastQueryRef.current, previousResultsRef.current);

    // Only skip entirely if query hasn't changed AND we already have the correct availability state
    // Use ref to avoid dependency issues
    if (canReuseResults &&
        usernameAvailableRef.current &&
        query.toLowerCase() === usernameAvailableRef.current.toLowerCase()) {
      // Everything matches, no need to re-search or re-check
      return;
    }

    // If query changed from available username, or we don't have availability state,
    // we need to re-check availability (fall through)

    searchActiveRef.current = true;
    setLoading(true);
    const currentQuery = query; // Capture for closure
    lastQueryRef.current = currentQuery;

    // Always check username availability, even if we can reuse search results
    // This ensures claim button works correctly when query changes
    Promise.all([
      canReuseResults ? Promise.resolve(previousResultsRef.current) : searchProfiles(currentQuery, 3),
      checkUsernameExists(currentQuery) // ALWAYS check availability, even if reusing results
    ])
      .then(([data, exists]) => {
        // Verify this is still the current query (user might have typed more)
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          setResults(data);
          if (!canReuseResults) {
            previousResultsRef.current = data;
          }

          // Check if exact query matches any result (case-insensitive)
          const exactMatch = data.some(
            (p) => (p.name || "").toLowerCase() === currentQuery.toLowerCase()
          );

          // Show claim option if:
          // 1. Username doesn't exist in database, AND
          // 2. No exact match in results (even if there are partial matches)
          if (!exists && !exactMatch) {
            usernameAvailableRef.current = currentQuery;
            setUsernameAvailable(currentQuery);
            onUsernameAvailable?.(currentQuery);
          } else {
            usernameAvailableRef.current = null;
            setUsernameAvailable(null);
            onUsernameAvailable?.(null);
          }

          setLoading(false);
        }
      })
      .catch((err) => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          console.error("Search error:", err);
          setLoading(false);
          usernameAvailableRef.current = null;
          setUsernameAvailable(null);
          onUsernameAvailable?.(null);
        }
      });

    return () => {
      searchActiveRef.current = false;
    };
  }, [searchDebounced, onUsernameAvailable]);

  // Show/hide dropdown based on value (using keystroke debounce for immediate UI)
  useEffect(() => {
    if (!keystrokeDebounced) {
      // Only hide if no username is available (keep claim popup visible)
      if (!usernameAvailable) {
        setShow(false);
      }
      return;
    }

    // Always show dropdown if there's a value or available username
    if (showByDefault || usernameAvailable) {
      setShow(true);
    }

    // Don't start hide timer if username is available (claim popup should persist)
    if (!usernameAvailable) {
      startHideTimer();
    } else {
      clearHideTimer();
    }

    return () => {
      // Only clear timer if username is not available
      if (!usernameAvailable) {
        clearHideTimer();
      }
    };
  }, [keystrokeDebounced, isHovering, showByDefault, usernameAvailable]);

  // Handle click outside
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      // Check if click is outside the dropdown
      if (!dropdownRef.current.contains(event.target)) {
        // Also check if click is on the input field (for list-only mode, the input is in parent)
        const inputElement = event.target.closest('input');
        if (!inputElement || inputElement.value !== value) {
          setShow(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, value]);

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
      {(show || usernameAvailable) && keystrokeDebounced && (
        <div
          onMouseEnter={() => {
            setIsHovering(true);
            clearHideTimer();
            // Ensure dropdown is shown when hovering
            if (!show) setShow(true);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            // Don't start hide timer if username is available (claim popup should persist)
            if (!usernameAvailable) {
              startHideTimer();
            }
          }}
          className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white backdrop-blur-md shadow-xl w-full"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-800 font-medium">
              Searching...
            </div>
          ) : (
            <>
              {/* Show availability message at the top if username is available */}
              {usernameAvailable && (
                <div className="px-3 py-2 text-sm text-gray-800 font-medium border-b border-gray-200 bg-green-50/50">
                  <span>
                    <span className="font-semibold text-green-700">@{usernameAvailable}</span> could be yours! Click Claim to register
                  </span>
                </div>
              )}

              {/* Show search results */}
              {results.length > 0 ? (
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
              ) : (
                !usernameAvailable && (
                  <div className="px-3 py-2 text-sm text-gray-800 font-medium">
                    No matches
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
