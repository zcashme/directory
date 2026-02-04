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
  const [prefillUsername, setPrefillUsername] = useState(null);
  const [availableUsername, setAvailableUsername] = useState(null);
  const [profileCount, setProfileCount] = useState(0);
  useEffect(() => {
    if (profiles.length > 0) {
      setProfileCount(profiles.length);
    }
  }, [profiles.length]);

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-lg z-[40] flex items-center gap-3 px-4 py-2 shadow-xs rounded-full border-4 border-red-500 w-[min(92vw,720px)] relative"
      style={{ border: '4px solid red' }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0 relative border-4 border-blue-500" style={{ border: '4px solid blue' }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            router.push("/");
          }}
          className="font-bold text-lg text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer z-10 border-4 border-purple-500"
          style={{ border: '4px solid purple' }}
        >
          Zcash.me/
        </button>
        <div className="relative flex-1 min-w-0 -mx-1 flex items-center border-4 border-orange-500" style={{ border: '4px solid orange' }}>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuppressDropdown(false);
              // Clear available username when search changes
              if (!e.target.value.trim()) {
                setAvailableUsername(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const query = search.trim();
                if (query) {
                  // Try to find exact match from dropdown results
                  // If no match, the dropdown will handle showing claim button
                  setSuppressDropdown(true);
                }
              }
            }}
            placeholder={
              profileCount > 1
                ? `search ${profileCount} names`
                : "search names"
            }
            className="flex-1 pl-3 pt-2 pb-1 text-sm leading-none bg-transparent text-gray-800 placeholder-gray-400 outline-hidden border-4 border-green-500 focus:border-green-600 transition-all pr-2"
            style={{
              paddingRight: availableUsername
                ? `${Math.max((availableUsername.length + 10) * 7.5 + 60, 200)}px`
                : search ? '2.5rem' : '0.5rem',
              border: '4px solid green'
            }}
          />

          {/* Join/Claim Button - Always inside search bar */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 z-[100] border-4 border-pink-500" style={{ border: '4px solid pink' }}>
            {/* X icon - to the left of the button */}
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setAvailableUsername(null);
                  requestAnimationFrame(() => {
                    if (searchInputRef.current) {
                      const el = searchInputRef.current;
                      el.focus();
                      el.setSelectionRange(0, 0);
                    }
                  });
                }}
                className="text-gray-500 hover:text-red-500 text-lg font-semibold leading-none flex-shrink-0 border-4 border-cyan-500"
                style={{ border: '4px solid cyan' }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => {
                if (availableUsername) {
                  setPrefillUsername(availableUsername);
                }
                setIsJoinOpen(true);
              }}
              className="bg-green-600 text-white px-6 py-3.5 rounded-full text-sm font-semibold shadow-md transition-all duration-300 z-[50] whitespace-nowrap overflow-hidden relative animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500 border-4 border-yellow-500"
              style={{
                width: availableUsername
                  ? `${Math.max((availableUsername.length + 10) * 7.5, 160)}px`
                  : undefined,
                minWidth: availableUsername ? '160px' : '100px',
                border: '4px solid yellow'
              }}
            >
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  availableUsername ? "opacity-0 translate-x-[-20px]" : "opacity-100 translate-x-0"
                }`}
              >
                Join
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  availableUsername ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[20px]"
                }`}
              >
                Claim @{availableUsername}
              </span>
            </button>
          </div>

          {search && !suppressDropdown && (
            <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1 z-[9999] border-4 border-indigo-500" style={{ border: '4px solid indigo' }}>
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
                onUsernameAvailable={(username) => {
                  setAvailableUsername(username);
                }}
                profiles={profiles}
                placeholder="search"
              />
            </div>
          )}
        </div>
      </div>

      <AddUserForm
        isOpen={isJoinOpen}
        prefillUsername={prefillUsername}
        onClose={() => {
          setIsJoinOpen(false);
          setPrefillUsername(null);
          setSearch("");
          setAvailableUsername(null);
        }}
        onUserAdded={() => {
          setIsJoinOpen(false);
          setPrefillUsername(null);
          setSearch("");
          setAvailableUsername(null);
        }}
      />
    </div>
  );
}
