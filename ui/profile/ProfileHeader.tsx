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
  const [search, setSearch] = useState("");
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState<string | null>(null);
  const [prefillReferrer, setPrefillReferrer] = useState<string | null>(null);
  const headerBarRef = useRef<HTMLDivElement | null>(null);

  const resetSearch = () => {
    setSearch("");
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
      className="sticky top-0 z-[1200]"
    >
      <div className="w-full">
        <div
          ref={headerBarRef}
          className="relative flex items-stretch w-full border-x border-t border-gray-200/50"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <div className="hidden sm:flex w-12 h-12 flex-shrink-0 items-center justify-center">
            <button
              onClick={() => router.push("/")}
              className="flex items-center justify-center h-full w-full"
              aria-label="Go to homepage"
            >
              <img
                src="/assets/icons/zcashme-logo.svg"
                alt="Zcash.me logo"
                className="h-10 w-10 object-contain translate-y-0.5"
              />
            </button>
          </div>

          <div className="h-12 flex items-center px-3 flex-shrink-0 sm:border-l border-gray-200/50">
            <button
              onClick={() => {
                const host = window.location.hostname;
                const parts = host.split('.');
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

          <div className="flex-1 min-w-0 h-12 border-l border-gray-200/50 relative">
            <ProfileSearchDropdown
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
              onClaimClick={(username: string) => {
                setPrefillUsername(username);
                setIsJoinOpen(true);
              }}
              dropdownContainerRef={headerBarRef}
              placeholder={profileCount > 1 ? `search ${profileCount} names` : "search names"}
              className="block w-full h-full min-w-0 px-3 py-[13px] text-sm leading-5 bg-transparent text-gray-800 placeholder-gray-400 outline-none"
            />
          </div>

          <div className="h-12 border-l border-gray-200/50 flex-shrink-0 flex items-center px-2">
            <motion.button
              onClick={() => {
                setIsJoinOpen(true);
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94, y: 1, filter: "brightness(0.95)" }}
              transition={{ type: "spring", stiffness: 550, damping: 24, mass: 0.35 }}
              className="h-8 rounded-md flex items-center justify-center bg-green-600 text-white px-4 text-sm font-semibold shadow-md whitespace-nowrap animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Join
            </motion.button>
          </div>

          <div className="hidden sm:block w-12 h-12 flex-shrink-0 border-l border-gray-200/50" />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.5) 36px, rgba(229,231,235,0.5) calc(100% - 36px), rgba(229,231,235,0) 100%)",
            }}
          />

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
