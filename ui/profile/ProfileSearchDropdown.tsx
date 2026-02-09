import React, { useState, useEffect, useRef } from "react";
import type { Profile } from "@/lib/profile/types";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Semantic aliases for different debounce contexts
const useKeystrokeDebounce = useDebounce; // UI responsiveness (10ms)
const useSearchDebounce = useDebounce;    // API calls (150ms)

interface SearchResult {
  profiles: Profile[];
  exists: boolean;
}

interface ProfileSearchDropdownProps {
  value: string;
  onChange: (value: string | Profile) => void; // eslint-disable-line no-unused-vars
  placeholder?: string;
  listOnly?: boolean;
  showByDefault?: boolean;
  onUsernameAvailable?: (username: string | null) => void; // eslint-disable-line no-unused-vars
  onResultsChange?: (results: Profile[]) => void; // eslint-disable-line no-unused-vars
  selectedIndex?: number;
  className?: string;
  [key: string]: unknown;
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
}: ProfileSearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const searchActiveRef = useRef(false);
  const lastQueryRef = useRef("");
  const previousResultsRef = useRef<Profile[]>([]);
  const usernameAvailableRef = useRef<string | null>(null);

  const keystrokeDebounced = useKeystrokeDebounce(value, 10);
  const searchDebounced = useSearchDebounce(value, 150);

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
  const resultsStillMatch = (query: string, previousQuery: string, previousResults: Profile[]): boolean => {
    if (!query || !previousQuery || previousResults.length === 0) return false;
    if (previousResults.length > 3) return false; // Only skip if <= 3 results

    if (query.toLowerCase() !== previousQuery.toLowerCase()) return false;

    const q = query.trim().toLowerCase();
    // Check if all previous results still match the query
    return previousResults.every((profile) => {
      const name = (profile.name || "").toLowerCase();
      const displayName = (profile.display_name || "").toLowerCase();
      return name.includes(q) || displayName.includes(q);
    });
  };

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

    const canReuseResults = resultsStillMatch(query, lastQueryRef.current, previousResultsRef.current);

    if (canReuseResults &&
        usernameAvailableRef.current &&
        query.toLowerCase() === usernameAvailableRef.current.toLowerCase()) {
      return;
    }

    searchActiveRef.current = true;
    setLoading(true);
    const currentQuery = query; // Capture for closure
    lastQueryRef.current = currentQuery;

    // Use API route instead of Server Action to prevent router cache invalidation
    const searchPromise = canReuseResults
      ? Promise.resolve({ profiles: previousResultsRef.current, exists: false })
      : fetch(`/api/search?q=${encodeURIComponent(currentQuery)}&limit=3`)
          .then(res => res.ok ? res.json() : { profiles: [], exists: false })
          .catch(() => ({ profiles: [], exists: false }));

    searchPromise
      .then((result: SearchResult) => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          const data = result.profiles || [];
          const exists = result.exists || false;

          setResults(data);
          if (!canReuseResults) {
            previousResultsRef.current = data;
          }

          // Check if exact query matches any result (case-insensitive)
          const exactMatch = data.some(
            (p) => (p.name || "").toLowerCase() === currentQuery.toLowerCase()
          );

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
      .catch(() => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
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

  useEffect(() => {
    if (!keystrokeDebounced) {
      if (!usernameAvailable) {
        setShow(false);
      }
      return;
    }

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
      if (!usernameAvailable) {
        clearHideTimer();
      }
    };
  }, [keystrokeDebounced, isHovering, showByDefault, usernameAvailable]);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      // Check if click is outside the dropdown
      if (!dropdownRef.current.contains(event.target as Node)) {
        const inputElement = (event.target as HTMLElement).closest('input');
        if (!inputElement || (inputElement as HTMLInputElement).value !== value) {
          setShow(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, value]);

  return (
    <>
      {/* Input only if NOT list-only */}
      {!listOnly && (
        <input
          ref={dropdownRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          style={{
            outline: 'none',
          }}
          {...props}
        />
      )}

      {/* Dropdown menu */}
      {(show || usernameAvailable) && keystrokeDebounced && (
        <div
          ref={listOnly ? dropdownRef : null}
          onMouseEnter={() => {
            setIsHovering(true);
            clearHideTimer();
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
                    <span className="font-semibold text-green-700">/{usernameAvailable}</span> Claim this name
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
                    <div>
                      <ProfileAvatar
                        profile={p}
                        size={32}
                        imageClassName="object-cover"
                      />
                    </div>

                    {/* Text + metadata */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate shrink-0">
                        {p.display_name || p.name}
                      </span>

                      {(p.address_verified || (p.verified_links_count ?? 0) > 0) && (
                        <div>
                          <VerifiedBadge verified={true} />
                        </div>
                      )}

                      <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                        /{p.name}
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
    </>
  );
}
