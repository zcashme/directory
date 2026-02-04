"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import { getProfileCount } from "@/lib/profile/profileQueries";

import AddUserForm from "@/ui/signup/AddUserForm";
import { buildSlug } from "@/lib/profile/profileUtils";

export default function ProfileHeader() {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState(null);
  const [availableUsername, setAvailableUsername] = useState(null);
  const [profileCount, setProfileCount] = useState(0);

  useEffect(() => {
    getProfileCount().then(setProfileCount);
  }, []);

  const resetSearch = () => {
    setSearch("");
    setAvailableUsername(null);
  };

  const closeForm = () => {
    setIsJoinOpen(false);
    setPrefillUsername(null);
    resetSearch();
  };

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-lg z-[40] flex items-center gap-3 px-4 py-2 shadow-xs rounded-full w-[min(92vw,720px)] relative"
    >
      <div className="flex items-center gap-1 flex-1 min-w-0 relative">
        <button
          onClick={() => router.push("/")}
          className="font-bold text-lg text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer z-10"
        >
          Zcash.me/
        </button>
        <div className="relative flex-1 min-w-0 -mx-1 flex items-center">
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuppressDropdown(false);
              if (!e.target.value.trim()) setAvailableUsername(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                setSuppressDropdown(true);
              }
            }}
            placeholder={profileCount > 1 ? `search ${profileCount} names` : "search names"}
            className="flex-1 pl-3 pt-2 pb-1 text-sm leading-none bg-transparent text-gray-800 placeholder-gray-400 outline-hidden transition-all pr-2"
            style={{
              paddingRight: availableUsername
                ? `${Math.max((availableUsername.length + 10) * 7.5 + 60, 200)}px`
                : search ? '2.5rem' : '0.5rem',
            }}
          />

          {/* Join/Claim Button - Always inside search bar */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 z-[100]">
            {/* X icon - to the left of the button */}
            {search && (
              <button
                onClick={() => {
                  resetSearch();
                  searchInputRef.current?.focus();
                }}
                className="text-gray-500 hover:text-red-500 text-lg font-semibold leading-none flex-shrink-0"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => {
                setPrefillUsername(availableUsername);
                setIsJoinOpen(true);
              }}
              className="bg-green-600 text-white px-6 py-3.5 rounded-full text-sm font-semibold shadow-md transition-all duration-300 z-[50] whitespace-nowrap overflow-hidden relative animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
              style={{
                width: availableUsername
                  ? `${Math.max((availableUsername.length + 10) * 7.5, 160)}px`
                  : undefined,
                minWidth: availableUsername ? '160px' : '100px',
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
                Claim /{availableUsername}
              </span>
            </button>
          </div>

          {search && !suppressDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[9999]">
              <ProfileSearchDropdown
                listOnly
                value={search}
                onChange={(v) => {
                  if (typeof v === "object") {
                    const slug = buildSlug(v);
                    if (slug) {
                      window.lastSelectionWasExplicit = true;
                      router.push(`/${slug}`);
                    }
                  } else {
                    setSearch(v);
                  }
                }}
                onUsernameAvailable={(username) => {
                  setAvailableUsername(username);
                }}
                placeholder="search"
              />
            </div>
          )}
        </div>
      </div>

      <AddUserForm
        isOpen={isJoinOpen}
        prefillUsername={prefillUsername}
        onClose={closeForm}
        onUserAdded={closeForm}
      />
    </div>
  );
}
