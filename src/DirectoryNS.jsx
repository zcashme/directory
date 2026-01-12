"use client";

import { useEffect, useMemo, useState } from "react";

import AddUserForm from "./AddUserForm";
import { useFeedback } from "./hooks/useFeedback";
import useFeedbackController from "./hooks/useFeedbackController";
import ProfileAvatar from "./components/ProfileAvatar";
import AmountAndWallet from "./components/AmountAndWallet";
import QrUriBlock from "./components/QrUriBlock";
import HelpMessage from "./components/HelpMessage";
import InlineCopyButton from "./components/directoryNs/InlineCopyButton";
import SocialLinks from "./components/directoryNs/SocialLinks";
import TagBadges from "./components/directoryNs/TagBadges";
import NsFilters from "./components/directoryNs/NsFilters";
import NsHeader from "./components/directoryNs/NsHeader";
import NsLocationFilterModal from "./components/directoryNs/NsLocationFilterModal";
import NsTable from "./components/directoryNs/NsTable";
import NsUnverifiedLinkModal from "./components/directoryNs/NsUnverifiedLinkModal";
import znsFavicon from "./assets/favicons/zns-favicon.png";
import useFlightPaths from "./hooks/directoryNs/useFlightPaths";
import useNsCounts from "./hooks/directoryNs/useNsCounts";
import useNsDirectory from "./hooks/directoryNs/useNsDirectory";
import useNsFilters from "./hooks/directoryNs/useNsFilters";
import useProfileModal from "./hooks/directoryNs/useProfileModal";
import { getProfileTags, normalizeSlug } from "./utils/directoryNsUtils";

export default function DirectoryAlt({ initialProfiles = null }) {
  const { setSelectedAddress, setForceShowQR, forceShowQR } = useFeedback();
  const { memo, amount, setDraftMemo, setDraftAmount, selectedAddress, uri } =
    useFeedbackController();
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
  } = useNsFilters(profiles);
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

  const announcementConfig = {
    enabled: true,
    message: "Zcash Office Hours",
    actionLabel: "Action",
    dismissLabel: "Dismiss",
  };

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const activeTags = useMemo(
    () => (activeProfile ? getProfileTags(activeProfile) : []),
    [activeProfile]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "ZNS";
    let faviconLink = document.querySelector("link[rel~='icon']");
    const previousHref = faviconLink?.getAttribute("href") || "";
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = znsFavicon?.src || znsFavicon;
    return () => {
      document.title = previousTitle;
      if (faviconLink && previousHref) {
        faviconLink.href = previousHref;
      }
    };
  }, []);


  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeLinks = activeProfile
    ? linksByProfileId[activeProfile?.id] || []
    : [];


  const showAnnouncement = announcementConfig.enabled && !isBannerDismissed;

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-gray-900 overflow-x-hidden">
      <NsUnverifiedLinkModal
        unverifiedLink={unverifiedLink}
        onClose={() => setUnverifiedLink(null)}
      />

      <NsHeader
        showAnnouncement={showAnnouncement}
        announcementConfig={announcementConfig}
        onDismissAnnouncement={() => setIsBannerDismissed(true)}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        nsCount={nsCount}
        onJoinClick={() => setIsJoinOpen(true)}
      />

      <div
        className={`mx-auto w-full max-w-6xl px-5 pb-16 pt-6 ${showAnnouncement ? "pt-32 sm:pt-36" : "pt-20 sm:pt-24"
          }`}
      >
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
          <h1 className="relative z-10 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            The peer-to-peer electronic cash of The Network School
          </h1>
          <div className="mt-4 md:hidden">
            <label className="sr-only" htmlFor="directory-search-card">
              Search profiles
            </label>
            <input
              id="directory-search-card"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                loading || nsCount <= 1
                  ? "Search"
                  : `Search ${nsCount} names`
              }
              className="h-9 w-full border border-gray-900 bg-white px-3 text-sm focus:outline-none rounded-none"
            />
          </div>
          <p className="mt-2 max-w-2xl text-sm text-gray-700">
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
          </p>
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
                  className="shadow-sm"
                  showFallbackIcon
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-nowrap min-w-0">
                      <div className="min-w-0 text-base font-black tracking-tight text-gray-900">
                        {activeProfile?.display_name || activeProfile?.name || "Unnamed"}
                      </div>
                      <TagBadges tags={activeTags} idPrefix="active-" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const slug = normalizeSlug(
                            activeProfile?.name || activeProfile?.display_name || ""
                          );
                          if (!slug) return;
                          const shareUrl = `https://zcash.me/${slug}`;
                          if (navigator.share) {
                            navigator.share({
                              title: activeProfile?.display_name || activeProfile?.name || "Zcash.me",
                              url: shareUrl,
                            });
                            return;
                          }
                          navigator.clipboard.writeText(shareUrl);
                          setShareStatus("Copied");
                          setTimeout(() => setShareStatus(""), 1500);
                        }}
                        className="border border-gray-900 bg-white px-2 py-1 text-xs font-semibold uppercase text-gray-900 rounded-none"
                        disabled={
                          !normalizeSlug(
                            activeProfile?.name || activeProfile?.display_name || ""
                          )
                        }
                      >
                        {shareStatus || "Share"}
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
                  <a
                    href={`https://zcash.me/${normalizeSlug(activeProfile?.name || activeProfile?.display_name || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline gap-0 text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:underline"
                  >
                    <span>Zcash.me/</span>
                    <span>{activeProfile?.name || activeProfile?.display_name || "Unnamed"}</span>
                  </a>
                  <SocialLinks
                    links={activeLinks}
                    onUnverifiedClick={setUnverifiedLink}
                    stopPropagation
                  />
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
                  Write a message to {activeProfile.display_name || activeProfile.name || "recipient"}
                </div>
                <textarea
                  value={memo}
                  onChange={(event) => setDraftMemo(event.target.value)}
                  placeholder={`Write your message to ${activeProfile.display_name || activeProfile.name || "recipient"} here...`}
                  className="mt-2 w-full border border-gray-900 bg-white px-3 py-2 text-sm resize-none focus:outline-none rounded-none"
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
                  showRateMessage
                />
              </div>

              <div className="directoryns-help directoryns-fieldset">
                <HelpMessage />
              </div>

              <div className="mt-4 directoryns-qr directoryns-fieldset">
                <QrUriBlock
                  uri={uri}
                  profileName={
                    activeProfile?.display_name || activeProfile?.name || "recipient"
                  }
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
    </div>
  );
}
