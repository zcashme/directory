"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";

import AddUserForm from "@/ui/signup/AddUserForm";
import { buildSlug } from "@/lib/profile/profileUtils";

interface ProfileHeaderProps {
  profileCount?: number;
}

export default function ProfileHeader({ profileCount = 0 }: ProfileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState<string | null>(null);
  const [prefillReferrer, setPrefillReferrer] = useState<string | null>(null);
  const [availableUsername, setAvailableUsername] = useState<string | null>(null);

  const resetSearch = () => {
    setSearch("");
    setAvailableUsername(null);
  };

  const closeForm = () => {
    setIsJoinOpen(false);
    setPrefillUsername(null);
    setPrefillReferrer(null);
    resetSearch();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenJoin = params.get("join") === "1";
    if (!shouldOpenJoin) return;

    const referredBy = (params.get("referred_by") || "").trim();
    const referredByIdRaw = (params.get("referred_by_id") || "").trim();
    const referredById = Number(referredByIdRaw);

    setPrefillUsername(null);
    setPrefillReferrer(referredBy || null);

    if (referredBy && Number.isInteger(referredById) && referredById > 0) {
      (window as any).lastReferrer = { id: referredById, name: referredBy };
    } else {
      (window as any).lastReferrer = null;
    }

    setIsJoinOpen(true);

    const nextSearch = new URLSearchParams(params.toString());
    nextSearch.delete("join");
    nextSearch.delete("referred_by");
    nextSearch.delete("referred_by_id");
    const nextUrl = `${pathname || "/"}${nextSearch.toString() ? `?${nextSearch.toString()}` : ""}`;
    router.replace(nextUrl);
  }, [pathname, router]);

  const isNsRoute = pathname === "/ns" || pathname?.startsWith("/ns/");
  if (isNsRoute) {
    return null;
  }

  return (
    <div
      data-global-header
      className="sticky top-0 z-[1200] pb-2"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
    >
      <div className="flex justify-center px-4">
        <div className="relative flex items-center gap-3 px-4 py-2.5 w-full max-w-[720px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full border border-gray-200/50" style={{ backgroundColor: 'var(--color-background)' }}>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                const host = window.location.hostname;
                const parts = host.split('.');
                // Detect subdomain: sub.localhost or sub.domain.tld (3+ parts)
                const isLocalhost = parts[parts.length - 1].includes('localhost');
                const isSubdomain = (isLocalhost && parts.length >= 2 && parts[0] !== 'localhost') || (!isLocalhost && parts.length >= 3);
                if (isSubdomain) {
                  const mainDomain = isLocalhost ? parts.slice(1).join('.') : parts.slice(1).join('.');
                  const port = window.location.port ? ':' + window.location.port : '';
                  window.location.href = `${window.location.protocol}//${mainDomain}${port}/`;
                } else {
                  router.push("/");
                }
              }}
              className="font-bold text-lg text-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] whitespace-nowrap cursor-pointer"
            >
              Zcash.me/
            </button>
          </div>

          <div className="flex-1 min-w-0 relative flex items-center">
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
              className="w-full min-w-0 pl-3 pt-2.5 pb-1.5 pr-8 text-sm leading-none bg-transparent text-gray-800 placeholder-gray-400 outline-none"
            />

            {search && (
              <button
                onClick={() => {
                  resetSearch();
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 text-lg font-semibold leading-none flex-shrink-0"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}

          </div>

          <motion.button
            onClick={() => {
              setPrefillUsername(availableUsername);
              setIsJoinOpen(true);
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.94, y: 1, filter: "brightness(0.95)" }}
            transition={{ type: "spring", stiffness: 550, damping: 24, mass: 0.35 }}
            className="flex-shrink-0 flex items-center justify-center bg-green-600 text-white px-4 rounded-full text-sm font-semibold shadow-md whitespace-nowrap animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            style={{
              height: '32px',
            }}
          >
            {availableUsername ? 'Claim' : 'Join'}
          </motion.button>

          {search && !suppressDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[9999]">
              <ProfileSearchDropdown
                listOnly
                value={search}
                onChange={(v) => {
                  if (typeof v === "object") {
                    const slug = buildSlug(v as Profile);
                    if (slug) {
                      (window as any).lastSelectionWasExplicit = true;
                      const host = window.location.hostname;
                      const hParts = host.split('.');
                      const isLH = hParts[hParts.length - 1].includes('localhost');
                      const isSub = (isLH && hParts.length >= 2 && hParts[0] !== 'localhost') || (!isLH && hParts.length >= 3);
                      if (isSub) {
                        const mainDomain = hParts.slice(1).join('.');
                        const port = window.location.port ? ':' + window.location.port : '';
                        window.location.href = `${window.location.protocol}//${mainDomain}${port}/${slug}`;
                      } else {
                        router.push(`/${slug}`);
                      }
                    }
                  } else {
                    setSearch(v);
                  }
                }}
                onUsernameAvailable={(username) => {
                  setAvailableUsername(username);
                }}
                onClaimClick={() => {
                  setPrefillUsername(availableUsername);
                  setIsJoinOpen(true);
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
        prefillReferrer={prefillReferrer}
        onClose={closeForm}
        onUserAdded={closeForm}
      />
    </div>
  );
}
