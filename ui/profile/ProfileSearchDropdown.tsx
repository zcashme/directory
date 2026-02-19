import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Profile } from "@/lib/profile/types";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import { withFieldBorderState } from "@/ui/common/forms/styles";

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

// API response format from /api/directory (matches wallet API docs)
interface ApiDirectoryResult {
  id: number;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  address: string | null;
  address_verified: boolean;
  verified_at: string | null;
  authenticated_links: { id: number; label: string; url: string; is_verified: boolean }[];
  unauthenticated_links: { id: number; label: string; url: string; is_verified: boolean }[];
}

interface ApiSearchResult {
  results: ApiDirectoryResult[];
  next_cursor: string | null;
  exists?: boolean;
}

// Transform API response to internal Profile format
function transformApiResult(r: ApiDirectoryResult): Profile {
  return {
    id: r.id,
    name: r.username,
    display_name: r.display_name ?? undefined,
    profile_image_url: r.profile_image_url ?? undefined,
    bio: r.bio ?? undefined,
    nearest_city_name: r.nearest_city_name ?? undefined,
    address: r.address ?? "",
    address_verified: r.address_verified,
    last_verified_at: r.verified_at ?? undefined,
    verified_links_count: r.authenticated_links.length,
    links: [...r.authenticated_links, ...r.unauthenticated_links],
  };
}

const formatUsername = (profile: Partial<Profile>): string =>
  getUsernameWithDiscriminator(profile).replace(/\s+/g, "_");

const getDisplayName = (profile: Partial<Profile>): string =>
  profile.display_name || profile.name || "";

interface SearchResult {
  results: Profile[];
  next_cursor: string | null;
  exists?: boolean;
}

interface ProfileSearchDropdownProps {
  value: string;
  onChange: (value: string | Profile) => void; // eslint-disable-line no-unused-vars
  placeholder?: string;
  listOnly?: boolean;
  showByDefault?: boolean;
  onUsernameAvailable?: (username: string | null) => void; // eslint-disable-line no-unused-vars
  onResultsChange?: (results: Profile[]) => void; // eslint-disable-line no-unused-vars
  onClaimClick?: () => void; // eslint-disable-line no-unused-vars
  showUsernameAvailability?: boolean;
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
  onClaimClick,
  showUsernameAvailability = true,
  className = `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`,
  ...props
}: ProfileSearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchActiveRef = useRef(false);
  const lastQueryRef = useRef("");
  const previousResultsRef = useRef<Profile[]>([]);
  const usernameAvailableRef = useRef<string | null>(null);

  const keystrokeDebounced = useKeystrokeDebounce(value, 10);
  const searchDebounced = useSearchDebounce(value, 150);

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
    // If on a subdomain (like swap.zcash.me), use the main domain for API calls
    const isSubdomain = typeof window !== 'undefined' && window.location.hostname.includes('swap.');
    const apiBaseUrl = isSubdomain
      ? `${window.location.protocol}//${window.location.hostname.replace('swap.', '')}${window.location.port ? ':' + window.location.port : ''}`
      : '';

    const searchPromise: Promise<SearchResult> = canReuseResults
      ? Promise.resolve({ results: previousResultsRef.current, next_cursor: null, exists: true })
      : fetch(`${apiBaseUrl}/api/directory?q=${encodeURIComponent(currentQuery)}&limit=3`, {
          headers: { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '' }
        })
          .then(res => res.ok ? res.json() : { results: [], next_cursor: null })
          .then((apiResult: ApiSearchResult) => ({
            results: apiResult.results.map(transformApiResult),
            next_cursor: apiResult.next_cursor,
            exists: apiResult.exists,
          }))
          .catch(() => ({ results: [], next_cursor: null }));

    searchPromise
      .then((result: SearchResult) => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          const data = result.results || [];
          const exists = result.exists ?? false;

          setResults(data);
          if (!canReuseResults) {
            previousResultsRef.current = data;
          }

          if (showUsernameAvailability && !exists) {
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
  }, [searchDebounced, onUsernameAvailable, showUsernameAvailability]);

  useEffect(() => {
    if (!keystrokeDebounced) {
      setShow(false);
      return;
    }

    if (showByDefault || usernameAvailable) {
      setShow(true);
    }
  }, [keystrokeDebounced, showByDefault, usernameAvailable]);

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
          ref={dropdownRef as RefObject<HTMLInputElement>}
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
          className="absolute left-0 top-full z-[1001] mt-1 max-h-48 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-md shadow-xl"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-800 font-medium">
              Searching...
            </div>
          ) : (
            <>
              {/* Show availability message at the top if username is available */}
              {usernameAvailable && (
                <div
                  onClick={() => {
                    onClaimClick?.();
                  }}
                  className="px-3 py-2 text-sm text-gray-800 font-medium border-b border-gray-200 bg-green-50/50 cursor-pointer hover:bg-green-100/50 transition-colors"
                >
                  <span>
                    <span className="font-semibold text-green-700">/{usernameAvailable}</span> is available!
                  </span>
                </div>
              )}

              {/* Show search results */}
              {results.length > 0 ? (
                results.map((p) => (
                  <div
                    key={`${p.name}-${p.id}`}
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
                        {getDisplayName(p)}
                      </span>

                      {(p.address_verified || (p.verified_links_count ?? 0) > 0) && (
                        <div>
                          <VerifiedBadge verified={true} />
                        </div>
                      )}

                      <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                        /{formatUsername(p)}
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
