import { useState, useEffect, useRef } from "react";
import { Command } from "cmdk";
import type { Profile } from "@/lib/profile/types";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import { withFieldBorderState } from "@/ui/common/forms/styles";

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
  showByDefault = true,
  onUsernameAvailable,
  onClaimClick,
  showUsernameAvailability = true,
  className = `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`,
  ...props
}: ProfileSearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [usernameAvailable, setUsernameAvailable] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchActiveRef = useRef(false);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const query = value?.trim();

    if (!query) {
      setResults([]);
      setUsernameAvailable(null);
      onUsernameAvailable?.(null);
      searchActiveRef.current = false;
      lastQueryRef.current = "";
      return;
    }

    searchActiveRef.current = true;
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
            setUsernameAvailable(currentQuery);
            onUsernameAvailable?.(currentQuery);
          } else {
            setUsernameAvailable(null);
            onUsernameAvailable?.(null);
          }
        }
      })
      .catch(() => {
        if (searchActiveRef.current && lastQueryRef.current === currentQuery) {
          setUsernameAvailable(null);
          onUsernameAvailable?.(null);
        }
      });

    return () => {
      searchActiveRef.current = false;
    };
  }, [value, onUsernameAvailable, showUsernameAvailability]);

  useEffect(() => {
    if (!value?.trim()) {
      setShow(false);
      return;
    }

    if (showByDefault || usernameAvailable) {
      setShow(true);
    }
  }, [value, showByDefault, usernameAvailable]);

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

  const dropdownVisible = (show || usernameAvailable) && value?.trim();

  return (
    <div ref={containerRef}>
      <Command shouldFilter={false}>
        <Command.Input
          value={value}
          onValueChange={(v) => {
            onChange(v);
            setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          style={{ outline: 'none' }}
          {...props}
        />

        {dropdownVisible && (
          <Command.List
            className="absolute left-0 top-full z-[1001] mt-1 max-h-48 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-md shadow-xl"
          >
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
                <div>
                  <ProfileAvatar
                    profile={p}
                    size={32}
                    imageClassName="object-cover"
                  />
                </div>

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
          </Command.List>
        )}
      </Command>
    </div>
  );
}
