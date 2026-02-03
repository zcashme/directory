"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import useProfiles from "@/lib/directory/useProfiles";

import AddUserForm from "@/ui/signup/AddUserForm";
import { normalizeSlug, buildSlug } from "@/lib/profile/normalizeSlugs";

export default function ProfileHeader() {
  const router = useRouter();
  const { profiles, loading } = useProfiles(null, true);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [profileCount, setProfileCount] = useState(0);
  useEffect(() => {
    if (profiles.length > 0) {
      setProfileCount(profiles.length);
    }
  }, [profiles.length]);

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-lg z-[40] flex items-center gap-3 px-4 py-2 shadow-xs rounded-full border border-white/40 w-[min(92vw,720px)]"
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            router.push("/");
          }}
          className="font-bold text-lg text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
        >
          Zcash.me/
        </button>
        <div className="relative flex-1 min-w-0 -mx-1">
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuppressDropdown(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const query = search.trim();
                if (query) {
                  // Find exact match or first match
                  const exactMatch = profiles.find(
                    (p) => p.name?.toLowerCase() === query.toLowerCase() ||
                           p.display_name?.toLowerCase() === query.toLowerCase()
                  );

                  if (exactMatch) {
                    const slug = buildSlug(exactMatch);
                    if (slug) {
                      router.push(`/${slug}`);
                    }
                  } else {
                    // Find first partial match
                    const firstMatch = profiles.find(
                      (p) => p.name?.toLowerCase().includes(query.toLowerCase()) ||
                             p.display_name?.toLowerCase().includes(query.toLowerCase())
                    );

                    if (firstMatch) {
                      const slug = buildSlug(firstMatch);
                      if (slug) {
                        router.push(`/${slug}`);
                      }
                    }
                  }
                  setSuppressDropdown(true);
                }
              }
            }}
            placeholder={
              profileCount > 1
                ? `search ${profileCount} names`
                : "search names"
            }
            className={`w-full pl-3 pt-2 pb-1 text-sm leading-none bg-transparent text-gray-800 placeholder-gray-400 outline-hidden border-b border-transparent focus:border-green-600 ${search ? "pr-10" : "pr-0"}`}
          />

          {search && (
            <button
              onClick={() => {
                setSearch("");
                requestAnimationFrame(() => {
                  if (searchInputRef.current) {
                    const el = searchInputRef.current;
                    el.focus();
                    el.setSelectionRange(0, 0);
                  }
                });
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 text-lg font-semibold leading-none z-[100]"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}

          {search && !suppressDropdown && (
            <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1 z-[9999]">
              <ProfileSearchDropdown
                listOnly
                value={search}
                onChange={(v) => {
                  if (typeof v === "object") {
                    window.lastSelectionWasExplicit = true;
                    const slug = buildSlug(v);
                    if (slug) router.push(`/${slug}`);
                  } else {
                    setSearch(v);
                  }
                }}
                profiles={profiles}
                placeholder="search"
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          setIsJoinOpen(true);
        }}
        className="ml-3 bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold
  shadow-md transition-all duration-300 z-[50] animate-joinPulse
  hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
      >
        Join
      </button>

      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => setIsJoinOpen(false)}
      />
    </div>
  );
}
