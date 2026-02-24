import React, { useState, useEffect, useRef, useCallback } from "react";
import { Command } from "cmdk";
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
  onClaimClick?: () => void; // eslint-disable-line no-unused-vars
  showUsernameAvailability?: boolean;
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
  const [selectedValue, setSelectedValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchActiveRef = useRef(false);
  const lastQueryRef = useRef("");
  const usernameAvailableRef = useRef<string | null>(null);

  const keystrokeDebounced = useKeystrokeDebounce(value, 10);
  const searchDebounced = useSearchDebounce(value, 150);

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
      return;
    }

    searchActiveRef.current = true;
    setLoading(true);
    const currentQuery = query;
    lastQueryRef.current = currentQuery;

    fetch(`/api/directory?q=${encodeURIComponent(currentQuery)}&limit=3`, {
      headers: { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '' }
    })
      .then(res => res.ok ? res.json() : { results: [], next_cursor: null })
      .then((apiResult: ApiSearchResult) => ({
        results: apiResult.results.map(transformApiResult),
        next_cursor: apiResult.next_cursor,
        exists: apiResult.exists,
      }))
      .then((result: SearchResult) => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          const data = result.results || [];
          const exists = result.exists ?? false;

          setResults(data);

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
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, value]);

  // Build ordered list of item values for listOnly keyboard nav
  const itemValues = useCallback(() => {
    const vals: string[] = [];
    if (usernameAvailable) vals.push("available");
    for (const p of results) vals.push(`profile-${p.id}`);
    return vals;
  }, [usernameAvailable, results]);

  // Handle selection (Enter or click) for a given cmdk value
  const handleSelect = useCallback((val: string) => {
    if (val === "available") {
      onClaimClick?.();
      return;
    }
    const profileId = val.replace("profile-", "");
    const selected = results.find((p) => String(p.id) === profileId);
    if (selected) {
      onChange(selected);
      setShow(false);
    }
  }, [results, onClaimClick, onChange]);

  // Keyboard nav for arrow/enter/escape (listOnly uses document listener,
  // non-listOnly uses onKeyDown on the raw input)
  const handleKeyNav = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    const vals = itemValues();
    if (!vals.length || loading) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!listOnly) setShow(true);
      setSelectedValue((prev) => {
        const idx = vals.indexOf(prev);
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const start = idx >= 0 ? idx : 0;
        const next = (start + delta + vals.length) % vals.length;
        return vals[next];
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const current = selectedValue || vals[0];
      handleSelect(current);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setShow(false);
    }
  }, [itemValues, loading, listOnly, selectedValue, handleSelect]);

  // listOnly: document keydown since the input is external
  useEffect(() => {
    if (!listOnly) return;
    if (!(show || usernameAvailable) || !keystrokeDebounced) return;

    const onDocumentKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      handleKeyNav(e);
    };

    document.addEventListener("keydown", onDocumentKeyDown, true);
    return () => document.removeEventListener("keydown", onDocumentKeyDown, true);
  }, [listOnly, show, usernameAvailable, keystrokeDebounced, handleKeyNav]);

  const dropdownVisible = (show || usernameAvailable) && keystrokeDebounced;

  return (
    <div ref={containerRef}>
      <Command shouldFilter={false} value={selectedValue} onValueChange={setSelectedValue}>
        {/* Input only if NOT list-only — raw <input> avoids cmdk's extra render cycle */}
        {!listOnly && (
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShow(true);
            }}
            onKeyDown={handleKeyNav}
            placeholder={placeholder}
            autoComplete="off"
            className={className}
            style={{ outline: 'none' }}
            {...props}
          />
        )}

        {/* Dropdown menu */}
        {dropdownVisible && (
          <Command.List
            className="absolute left-0 top-full z-[1001] mt-1 max-h-48 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-md shadow-xl"
          >
            {loading ? (
              <Command.Loading>
                <div className="px-3 py-2 text-sm text-gray-800 font-medium">
                  Searching...
                </div>
              </Command.Loading>
            ) : (
              <>
                {usernameAvailable && (
                  <Command.Item
                    value="available"
                    forceMount
                    onSelect={() => onClaimClick?.()}
                    className="px-3 py-2 text-sm text-gray-800 font-medium border-b border-gray-200 cursor-pointer transition-colors bg-green-50/50 data-[selected=true]:bg-green-100/60 hover:bg-green-100/50"
                  >
                    <span>
                      <span className="font-semibold text-green-700">/{usernameAvailable}</span> is available!
                    </span>
                  </Command.Item>
                )}

                {results.map((p) => (
                  <Command.Item
                    key={`${p.name}-${p.id}`}
                    value={`profile-${p.id}`}
                    onSelect={() => {
                      onChange(p);
                      setShow(false);
                    }}
                    className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-gray-800 font-semibold transition-colors hover:bg-gray-100 data-[selected=true]:bg-gray-100"
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
                  </Command.Item>
                ))}

                {results.length === 0 && !usernameAvailable && (
                  <Command.Empty>
                    <div className="px-3 py-2 text-sm text-gray-800 font-medium">
                      No matches
                    </div>
                  </Command.Empty>
                )}
              </>
            )}
          </Command.List>
        )}
      </Command>
    </div>
  );
}
