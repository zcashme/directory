"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/profile/types";
import type { LinksByProfileId } from "./useNsDirectory";
import type { UnverifiedLinkData } from "./types";

import LoadingDots from "./LoadingDots";
import NsRow from "./NsRow";

interface NsTableProps {
  loading: boolean;
  filteredProfiles: Profile[];
  linksByProfileId: LinksByProfileId;
  setUnverifiedLink: (_link: UnverifiedLinkData | null) => void;
  onStickyStateChange?: (_sticky: boolean) => void;
}

export default function NsTable({
  loading,
  filteredProfiles,
  linksByProfileId,
  setUnverifiedLink,
  onStickyStateChange,
}: NsTableProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [headerWidth, setHeaderWidth] = useState(0);
  const [headerLeft, setHeaderLeft] = useState(0);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [expandedQrAddress, setExpandedQrAddress] = useState<string | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const headerAnchor = headerAnchorRef.current;
    const tableHeader = headerRef.current;
    const siteHeader = document.querySelector<HTMLElement>("[data-ns-site-header]");
    if (!sentinel || !headerAnchor || !tableHeader) return;

    const updateMeasurements = () => {
      const anchorRect = headerAnchor.getBoundingClientRect();
      const headerRect = tableHeader.getBoundingClientRect();
      const nextStickyOffset = siteHeader?.getBoundingClientRect().height ?? 0;
      setStickyOffset(nextStickyOffset);
      setHeaderHeight(headerRect.height);
      setHeaderWidth(anchorRect.width);
      setHeaderLeft(anchorRect.left);
      return nextStickyOffset;
    };

    const updateFixedState = (topValue?: number, nextStickyOffset?: number) => {
      const resolvedStickyOffset = nextStickyOffset ?? siteHeader?.getBoundingClientRect().height ?? 0;
      const sentinelTop = topValue ?? sentinel.getBoundingClientRect().top;
      setStickyOffset(resolvedStickyOffset);
      setIsHeaderFixed(window.innerWidth >= 768 && sentinelTop <= resolvedStickyOffset);
    };

    const initialStickyOffset = updateMeasurements();
    updateFixedState(undefined, initialStickyOffset);

    let intersectionObserver: IntersectionObserver | null = null;

    const setupIntersectionObserver = (nextStickyOffset: number) => {
      intersectionObserver?.disconnect();
      intersectionObserver =
        typeof IntersectionObserver !== "undefined"
          ? new IntersectionObserver(
              ([entry]) => {
                updateFixedState(entry.boundingClientRect.top);
              },
              {
                root: null,
                threshold: [0, 1],
                rootMargin: `-${nextStickyOffset}px 0px 0px 0px`,
              }
            )
          : null;

      intersectionObserver?.observe(sentinel);
    };

    setupIntersectionObserver(initialStickyOffset);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            const nextStickyOffset = updateMeasurements();
            updateFixedState(undefined, nextStickyOffset);
            setupIntersectionObserver(nextStickyOffset);
          })
        : null;

    resizeObserver?.observe(tableHeader);
    resizeObserver?.observe(headerAnchor);
    if (siteHeader) {
      resizeObserver?.observe(siteHeader);
    }

    const handleResize = () => {
      const nextStickyOffset = updateMeasurements();
      updateFixedState(undefined, nextStickyOffset);
      setupIntersectionObserver(nextStickyOffset);
    };

    const handleScroll = () => {
      updateFixedState();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    onStickyStateChange?.(isHeaderFixed);
  }, [isHeaderFixed, onStickyStateChange]);

  const rows = useMemo(
    () =>
      filteredProfiles.map((profile) => (
        <NsRow
          key={profile?.id ?? profile?.address}
          profile={profile}
          links={linksByProfileId[profile.id] ?? []}
          onUnverifiedLink={setUnverifiedLink}
          isQrExpanded={Boolean(profile.address && expandedQrAddress === profile.address)}
          onToggleInlineQr={(address) =>
            setExpandedQrAddress((current) => (current === address ? null : address))
          }
        />
      )),
    [
      filteredProfiles,
      linksByProfileId,
      setUnverifiedLink,
      expandedQrAddress,
    ]
  );

  return (
    <div className="mt-6">
      <div>
        <div ref={sentinelRef} aria-hidden="true" className="hidden h-px md:block" />
        <div ref={headerAnchorRef} className="hidden md:block">
          <div
            ref={headerRef}
            data-ns-table-header
            className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-4 border border-gray-900 bg-white px-4 py-3 text-xs font-semibold tracking-wide rounded-none ${
              isHeaderFixed ? "fixed z-20" : ""
            }`}
            style={
              isHeaderFixed
                ? {
                    top: `${stickyOffset}px`,
                    left: `${headerLeft}px`,
                    width: `${headerWidth}px`,
                  }
                : undefined
            }
          >
            <div className="flex items-center">Name</div>
            <div className="flex items-center">Address</div>
            <div className="flex items-center">Last Verified</div>
            <div className="flex items-center">Nearest City</div>
            <div className="flex items-center">Social</div>
          </div>
          {isHeaderFixed ? <div style={{ height: `${headerHeight}px` }} /> : null}
        </div>

        {loading && (
          <LoadingDots
            colors={["#000000", "#000000", "#000000", "#000000"]}
            className="py-10"
          />
        )}

        {!loading && filteredProfiles.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-600">No profiles found.</div>
        )}

        {!loading && rows}
      </div>
    </div>
  );
}
