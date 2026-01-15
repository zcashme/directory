"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileSearchDropdown from "./ProfileSearchDropdown";
import useProfiles from "../hooks/useProfiles";
import { useFeedback } from "../hooks/useFeedback";
import AddUserForm from "../AddUserForm";

const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

const buildSlug = (profile) => {
  if (!profile?.name) return "";
  const base = normalizeSlug(profile.name);
  if (!base) return "";
  if (profile.slug) return profile.slug;
  return profile.address_verified ? base : `${base}-${profile.id}`;
};

export default function ProfileHeader() {
  const router = useRouter();
  const { setSelectedAddress, selectedAddress } = useFeedback();
  const { profiles, loading } = useProfiles(null, true);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const selectedProfile = profiles.find(
    (profile) => profile.address === selectedAddress
  );

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-lg z-[40] flex items-center gap-3 px-4 py-2 shadow-sm rounded-full border border-white/40 w-[min(92vw,720px)]"
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
                  router.push(`/?search=${encodeURIComponent(query)}`);
                  setSuppressDropdown(true);
                }
              }
            }}
            placeholder={
              loading || profiles.length <= 1
                ? "  search names"
                : `  search ${profiles.length} names`
            }
            className={`w-full pl-0 pt-2 pb-1 text-sm leading-none bg-transparent text-gray-800 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-600 ${search ? "pr-10" : "pr-0"}`}
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
                    const addr = v.address;
                    setSelectedAddress(addr);
                    window.dispatchEvent(
                      new CustomEvent("selectAddress", { detail: { address: addr } })
                    );
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
          if (selectedProfile) {
            window.dispatchEvent(
              new CustomEvent("prefillReferrer", {
                detail: {
                  id: selectedProfile.id,
                  name: selectedProfile.name,
                  address: selectedProfile.address,
                },
              })
            );

            window.lastReferrer = {
              id: selectedProfile.id,
              name: selectedProfile.name,
              address: selectedProfile.address,
            };
          }

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
