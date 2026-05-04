"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile/types";

import AddUserForm from "@/ui/signup/AddUserForm";
function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch { return ""; }
}

function buildZcashUri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import HelpMessage from "@/ui/verification/HelpMessage";
import InlineCopyButton from "./InlineCopyButton";
import SocialLinks from "./SocialLinks";
import TagBadges from "./TagBadges";
import NsFilters from "./NsFilters";
import NsHeader from "./NsHeader";
import NsLocationFilterModal from "./NsLocationFilterModal";
import NsTable from "./NsTable";
import NsUnverifiedLinkModal from "./NsUnverifiedLinkModal";
import { NsDirectoryHero, NsPageFrame } from "./NsLandingComponents";
import useFlightPaths from "./useFlightPaths";
import useNsCounts from "./useNsCounts";
import useNsDirectory, { type EnrichedLink } from "./useNsDirectory";
import useNsFilters from "./useNsFilters";
import useProfileModal from "./useProfileModal";
import { getProfileTags, normalizeSlug } from "./directoryNsUtils";
import { hasPendingNsSignupDiscord } from "@/ui/links/nsSignupDiscord";
import { nsLandingOrder, nsLandingPages } from "./nsLandingContent";

export default function DirectoryAlt({
  initialProfiles = null,
  initialActiveUsername = null,
  initialSearch = "",
}: {
  initialProfiles?: Profile[] | null;
  initialActiveUsername?: string | null;
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Local state
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [forceShowQR, setForceShowQR] = useState(false);
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const { profiles, loading, addProfile, linksByProfileId } = useNsDirectory(
    initialProfiles
  );
  const {
    search,
    setSearch,
    filters,
    toggleFilter,
    clearFilters,
    anyFilterActive,
    locationFilter,
    setLocationFilter,
    locationSearch,
    setLocationSearch,
    filteredLocationOptions,
    filteredProfiles,
    filteredCount,
    isFiltering,
  } = useNsFilters(profiles, initialSearch);
  const { nsCount, verifiedCount, rankedCount, coreCount, longtermCount } =
    useNsCounts(profiles);
  const {
    activeProfile,
    setActiveProfile,
    shareStatus,
    setShareStatus,
    unverifiedLink,
    setUnverifiedLink,
  } = useProfileModal();
  const flightPaths = useFlightPaths();

  const setDraftMemo = (memoValue: string) => {
    setMemo(memoValue);
  };

  const setDraftAmount = (amountValue: string) => {
    setAmount(amountValue);
  };

  const uri = useMemo(() => {
    const finalAmount = amount && amount !== "0" ? amount : "0";
    return buildZcashUri(selectedAddress ?? "", finalAmount, memo);
  }, [memo, amount, selectedAddress]);

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const activeTags = useMemo(
    () => (activeProfile ? getProfileTags(activeProfile) : []),
    [activeProfile]
  );

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (hasPendingNsSignupDiscord()) {
      setIsJoinOpen(true);
    }
  }, []);

  const activeLinks: EnrichedLink[] = activeProfile
    ? linksByProfileId[activeProfile.id] ?? []
    : [];
  const activeProfileName = activeProfile?.display_name ?? activeProfile?.name ?? "Unnamed";
  const activeProfileUsername = (activeProfile?.name || "").trim();
  const activeProfileSlug = normalizeSlug(activeProfileUsername);
  const activeProfileHref = activeProfileSlug ? `https://zcash.me/${activeProfileSlug}` : "";


  const extraLandingActions = nsLandingOrder
    .filter((slug) => slug !== "start" && slug !== "learn")
    .map((slug) => nsLandingPages[slug].primaryAction.href === `/ns/${slug}`
      ? { href: `/ns/${slug}`, label: nsLandingPages[slug].eyebrow }
      : { href: `/ns/${slug}`, label: nsLandingPages[slug].eyebrow });

  useEffect(() => {
    if (!initialActiveUsername || activeProfile) return;
    const decoded = decodeURIComponent(initialActiveUsername).trim().toLowerCase();
    if (!decoded) return;
    const match = profiles.find((profile) => normalizeSlug((profile.name || "").trim()) === decoded);
    if (match) {
      setActiveProfile(match);
    }
  }, [activeProfile, initialActiveUsername, profiles, setActiveProfile]);

  useEffect(() => {
    if (!activeProfileSlug) return;
    if (pathname === `/ns/${activeProfileSlug}`) return;
    router.replace(`/ns/${activeProfileSlug}`, { scroll: false });
  }, [activeProfileSlug, pathname, router]);

  useEffect(() => {
    if (activeProfile) return;
    if (pathname === "/ns") return;
    if (!pathname?.startsWith("/ns/")) return;
    router.replace("/ns", { scroll: false });
  }, [activeProfile, pathname, router]);

  return (
    <NsPageFrame>
      <NsUnverifiedLinkModal
        unverifiedLink={unverifiedLink}
        onClose={() => setUnverifiedLink(null)}
      />

      <NsHeader
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        nsCount={nsCount}
        onJoinClick={() => setIsJoinOpen(true)}
      />

      <div className="pt-0">
        <div className="mt-6 relative">
          <div className="pointer-events-none absolute left-1/2 -top-16 z-0 h-36 w-36 -translate-x-1/2 opacity-70">
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="globeFade" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#f2f2f2" />
                  <stop offset="100%" stopColor="#d9d9d9" />
                </radialGradient>
                <linearGradient id="globeMask" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <mask id="fadeMask">
                  <rect x="0" y="0" width="200" height="200" fill="url(#globeMask)" />
                </mask>
              </defs>
              <g mask="url(#fadeMask)">
                <circle cx="100" cy="100" r="90" fill="url(#globeFade)" stroke="#cfcfcf" strokeWidth="2" />
                <path d="M20 100 C60 80, 140 80, 180 100" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M20 100 C60 120, 140 120, 180 100" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M100 10 C120 60, 120 140, 100 190" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M100 10 C80 60, 80 140, 100 190" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                {flightPaths.map((path) => (
                  <path
                    key={`${path.id}-${path.d}`}
                    d={path.d}
                    fill="none"
                    stroke="#bdbdbd"
                    strokeWidth="2"
                    pathLength="1"
                    strokeDasharray={`${path.dashRatio} 1`}
                    className="flight-path"
                    style={{
                      animationDuration: `${path.duration}s, ${path.duration}s`,
                      animationDelay: `${path.delay}s, ${path.delay}s`,
                    }}
                  />
                ))}
              </g>
            </svg>
          </div>
          <NsDirectoryHero
            countSummary={
              <>
                This is a directory of Zcash users at{" "}
                <a
                  href="https://ns.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Network School
                </a>
                . Now features{" "}
                <span className="font-semibold">
                  {isFiltering ? `${filteredCount} of ${nsCount}` : nsCount}
                </span>{" "}
                names.{" "}
                <button
                  type="button"
                  onClick={() => window.alert("Coming Soon. Not affiliated with ns.com (at least, not yet).")}
                  className="font-semibold underline underline-offset-2"
                >
                  Frequently Asked Questions
                </button>
              </>
            }
            extraActions={extraLandingActions}
          >
            <></>
          </NsDirectoryHero>
        </div>

        <NsFilters
          anyFilterActive={anyFilterActive}
          clearFilters={clearFilters}
          filters={filters}
          toggleFilter={toggleFilter}
          nsCount={nsCount}
          verifiedCount={verifiedCount}
          coreCount={coreCount}
          longtermCount={longtermCount}
          rankedCount={rankedCount}
          onOpenLocationFilter={() => {
            setShowLocationFilter(true);
            setLocationSearch("");
          }}
        />

        <NsTable
          loading={loading}
          filteredProfiles={filteredProfiles}
          linksByProfileId={linksByProfileId}
          selectedAddress={selectedAddress}
          setSelectedAddress={setSelectedAddress}
          setDraftMemo={setDraftMemo}
          setActiveProfile={setActiveProfile}
          setForceShowQR={setForceShowQR}
          setUnverifiedLink={setUnverifiedLink}
        />

        {showLocationFilter && (
          <NsLocationFilterModal
            locationSearch={locationSearch}
            setLocationSearch={setLocationSearch}
            filteredLocationOptions={filteredLocationOptions}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            onClose={() => setShowLocationFilter(false)}
          />
        )}

        {activeProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => {
                setActiveProfile(null);
              }}
              aria-label="Close"
            />
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-gray-900 bg-white px-4 py-4 rounded-none directoryns-popup">
              <div className="flex items-start gap-3">
                <ProfileAvatar
                  profile={activeProfile}
                  size={72}
                  imageClassName="object-contain"
                  className="shadow-xs"
                  fallbackVariant="ns-transparent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-nowrap min-w-0">
                      <div className="min-w-0 text-base font-black tracking-tight text-gray-900">
                        {activeProfileName}
                      </div>
                      <TagBadges tags={activeTags} idPrefix="active-" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const slug = activeProfileSlug;
                          if (!slug) return;
                          const shareUrl = `https://zcash.me/${slug}`;
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: activeProfileName,
                                url: shareUrl,
                              });
                              return;
                            } catch {
                              // User cancelled or failed - fall through to clipboard
                            }
                          }
                          await navigator.clipboard.writeText(shareUrl);
                          setShareStatus("Copied");
                          setTimeout(() => setShareStatus(""), 1500);
                        }}
                        className="border border-gray-900 bg-transparent px-2 py-1 text-xs font-semibold uppercase text-gray-900 rounded-none"
                        disabled={!activeProfileSlug}
                      >
                        {(shareStatus || "Share").toUpperCase()}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProfile(null);
                        }}
                        className="border border-gray-900 bg-gray-900 px-2 py-1 text-xs font-semibold uppercase text-white rounded-none"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <a
                        href={activeProfileHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:underline"
                      >
                        <span>Zcash.me/</span>
                        <span>{activeProfileUsername}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <path d="M12.5 3a.75.75 0 0 0 0 1.5h1.94L8.22 10.72a.75.75 0 1 0 1.06 1.06l6.22-6.22V7.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 16.25 3H12.5Z" />
                          <path d="M5.5 4.25A2.25 2.25 0 0 0 3.25 6.5v8A2.25 2.25 0 0 0 5.5 16.75h8a2.25 2.25 0 0 0 2.25-2.25V11a.75.75 0 0 0-1.5 0v3.5c0 .414-.336.75-.75.75h-8a.75.75 0 0 1-.75-.75v-8c0-.414.336-.75.75-.75H9a.75.75 0 0 0 0-1.5H5.5Z" />
                        </svg>
                      </a>
                    </div>
                    <div className="mt-2">
                      <SocialLinks
                        links={activeLinks}
                        onUnverifiedClick={setUnverifiedLink}
                        stopPropagation
                        prependLink={activeProfileHref ? {
                          href: activeProfileHref,
                          label: activeProfileUsername,
                          title: "Zcash.me profile",
                          iconSrc: "/assets/icons/zcashme-logo.svg",
                        } : undefined}
                      />
                    </div>
                </div>
              </div>

              <div className="mt-4 directoryns-fieldset">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Address
                </div>
                {activeProfile?.address ? (
                  <div className="mt-1 flex h-7 max-w-full items-center gap-2 border border-gray-900 bg-gray-50 px-3 text-sm font-mono text-gray-700 rounded-none">
                    <span
                      className="min-w-0 flex-1 break-all"
                      title={activeProfile.address}
                    >
                      {activeProfile.address.length > 24
                        ? `${activeProfile.address.slice(0, 8)}...${activeProfile.address.slice(-8)}`
                        : activeProfile.address}
                    </span>
                    <InlineCopyButton text={activeProfile.address} />
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-gray-500">-</div>
                )}
              </div>

              <div className="mt-4 directoryns-fieldset">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Write a message to {activeProfileName}
                </div>
                <textarea
                  value={memo}
                  onChange={(event) => setDraftMemo(event.target.value)}
                  placeholder={`Write a shielded message to ${activeProfileName}`}
                  className="mt-2 w-full border border-gray-900 bg-white px-3 py-2 text-sm resize-none focus:outline-hidden rounded-none"
                  rows={4}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>

              <div className="mt-4 directoryns-amount directoryns-fieldset">
                <AmountAndWallet
                  amount={amount}
                  setAmount={setDraftAmount}
                  openWallet={() => {}}
                  showOpenWallet={false}
                  showUsdPill
                />
              </div>

              <div className="directoryns-help directoryns-fieldset">
                <HelpMessage />
              </div>

              <div className="mt-4 directoryns-qr directoryns-fieldset">
                <QrUriBlock
                  uri={uri}
                  memoText={memo}
                  profileName={activeProfileName}
                  forceShowQR={forceShowQR}
                  defaultShowQR={false}
                  defaultShowURI={false}
                  actionButtonClassName="border border-gray-900 bg-white px-2 py-1 text-xs font-semibold uppercase text-gray-900 rounded-none"
                  hideButtonClassName="bg-transparent px-2 py-1 text-xs font-semibold uppercase text-gray-900 rounded-none"
                />
              </div>
            </div>
          </div>
        )}

      </div>

      <AddUserForm
        isOpen={isJoinOpen}
        isNsSignup
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={(newProfile) => {
          addProfile(newProfile);
          setIsJoinOpen(false);
        }}
      />
      {showBackToTop && !activeProfile && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 border border-gray-900 bg-gray-900 px-4 py-2 text-xs font-semibold uppercase text-white transition-transform duration-150 hover:scale-[1.04] active:scale-[0.98] rounded-none md:hidden"
        >
          Back to top
        </button>
      )}
    </NsPageFrame>
  );
}
