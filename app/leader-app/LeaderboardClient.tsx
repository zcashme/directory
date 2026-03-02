"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import Badge from "@/ui/common/feedback/Badge";
import type { LeaderboardEntry, Period } from "@/lib/leaderboard/getLeaderboardAction";
import { buildSlug } from "@/lib/profile/profileUtils";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";

// ── PodiumAvatar ──────────────────────────────────────────────

export function PodiumAvatar({
  profileHref,
  imageUrl,
  name,
  emoji,
  size,
}: {
  profileHref: string;
  imageUrl: string | null;
  name: string;
  emoji: string;
  size: number;
}) {
  return (
    <div className="relative transition-transform duration-150 hover:scale-110">
      <Link href={profileHref} aria-label="View profile">
        <ProfileAvatar
          profile={{ profile_image_url: imageUrl ?? undefined, name }}
          size={size}
        />
      </Link>
      <span
        className="absolute left-1/2 -bottom-2 -translate-x-1/2 text-2xl sm:text-3xl z-20 select-none pointer-events-none"
        aria-hidden="true"
      >
        {emoji}
      </span>
    </div>
  );
}

// ── LeaderAvatar ──────────────────────────────────────────────

export function LeaderAvatar({
  imageUrl,
  name,
  size,
}: {
  imageUrl: string | null;
  name: string;
  size: number;
}) {
  return (
    <ProfileAvatar
      profile={{ profile_image_url: imageUrl ?? undefined, name }}
      size={size}
    />
  );
}

// ── LeaderboardTable ──────────────────────────────────────────

const ROWS_PER_PAGE = 10;
const DEFAULT_VISIBLE_ROWS = 10;
const SORT_DROPDOWN_ARROW_CLASS =
  "inline-flex items-center justify-center text-base leading-none text-current transition-transform duration-200";

function useSlidingHeaderLabel(rebindKey: string): {
  tableRef: RefObject<HTMLDivElement | null>;
  stickyRef: RefObject<HTMLDivElement | null>;
  adjacentRef: RefObject<HTMLDivElement | null>;
  shiftPx: number;
  labelWidthPx: number;
} {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const adjacentRef = useRef<HTMLDivElement | null>(null);
  const maxShiftRef = useRef(0);
  const [shiftPx, setShiftPx] = useState(0);
  const [labelWidthPx, setLabelWidthPx] = useState(0);

  useEffect(() => {
    const tableEl = tableRef.current;
    const stickyEl = stickyRef.current;
    const adjacentEl = adjacentRef.current;
    if (!tableEl || !stickyEl || !adjacentEl) return;

    const updateShiftBounds = () => {
      const stickyWidth = stickyEl.getBoundingClientRect().width;
      const adjacentWidth = adjacentEl.getBoundingClientRect().width;
      setLabelWidthPx(stickyWidth + adjacentWidth);
      maxShiftRef.current = Math.max(0, adjacentWidth / 2);
      setShiftPx(Math.min(tableEl.scrollLeft, maxShiftRef.current));
    };

    const handleScroll = () => {
      setShiftPx(Math.min(tableEl.scrollLeft, maxShiftRef.current));
    };

    updateShiftBounds();
    tableEl.addEventListener("scroll", handleScroll, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateShiftBounds);
      resizeObserver.observe(tableEl);
      resizeObserver.observe(stickyEl);
      resizeObserver.observe(adjacentEl);
      return () => {
        tableEl.removeEventListener("scroll", handleScroll);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateShiftBounds);
    return () => {
      tableEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateShiftBounds);
    };
  }, [rebindKey]);

  return { tableRef, stickyRef, adjacentRef, shiftPx, labelWidthPx };
}

export function LeaderboardTable({
  children,
  totalRows,
  header,
  emptyState,
  tableRef,
  tableClassName,
  controlsMarginClassName = "mt-8",
}: {
  children: ReactNode[];
  totalRows: number;
  header?: ReactNode;
  emptyState?: ReactNode;
  tableRef?: RefObject<HTMLDivElement | null>;
  tableClassName?: string;
  controlsMarginClassName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_ROWS);

  const visibleChildren = children.slice(0, visibleCount);
  const hasMore = visibleCount < totalRows;

  return (
    <div className="flex flex-col">
      <div ref={tableRef} className={tableClassName}>
        {header}
        {visibleChildren.length > 0 ? visibleChildren : emptyState}
      </div>

      {(visibleCount > DEFAULT_VISIBLE_ROWS || hasMore) && (
        <div className={`${controlsMarginClassName} flex justify-center`}>
          <div className="flex items-center gap-2">
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + ROWS_PER_PAGE, totalRows))}
                className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Show More
              </button>
            )}
            {visibleCount > DEFAULT_VISIBLE_ROWS && (
              <button
                type="button"
                onClick={() => setVisibleCount(DEFAULT_VISIBLE_ROWS)}
                className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Show 10
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type LeaderboardSortMetric = "verified" | "earned";

const LEADERBOARD_SORT_OPTIONS: Array<{ value: LeaderboardSortMetric; label: string }> = [
  { value: "verified", label: "verified referrals" },
  { value: "earned", label: "earned (zats)" },
];

const LEADERBOARD_GRID_CLASSES =
  "grid-cols-[48px_56px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_62px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)]";
const LEADERBOARD_MIN_WIDTH_CLASS = "min-w-[700px]";

function formatZats(value: number): string {
  return Math.round(value * 100000000).toLocaleString("en-US");
}

const PERIOD_TITLE_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "alltime", label: "All Time" },
  { value: "monthly", label: "This Month's" },
  { value: "weekly", label: "This Week's" },
  { value: "daily", label: "Today's" },
];

export function LeaderboardPeriodTitle({ period }: { period: Period }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement | null>(null);
  const selectedLabel =
    PERIOD_TITLE_OPTIONS.find((option) => option.value === period)?.label ?? "All Time";
  const menuOptions = PERIOD_TITLE_OPTIONS.filter((option) => option.value !== period);

  useEffect(() => {
    if (!menuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <h1 className="text-2xl font-bold text-center">
      <span className="inline-flex items-center gap-2">
        <span ref={menuRef} className="relative inline-flex items-center">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`group inline-flex items-center gap-1 font-bold leading-none transition-colors ${
            menuOpen
              ? "text-[var(--color-brand-blue)]"
              : "text-gray-900 hover:text-[var(--color-brand-blue)]"
          }`}
        >
          <span
            aria-hidden
            className={`${SORT_DROPDOWN_ARROW_CLASS} ${menuOpen ? "rotate-180" : "rotate-0"}`}
          >
            {"\u25BE"}
          </span>
          <span className="underline underline-offset-2">{selectedLabel}</span>
        </button>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute left-0 top-full z-[1001] mt-1 min-w-[180px]"
            >
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {menuOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={`?period=${option.value}`}
                    onClick={() => setMenuOpen(false)}
                    className="group flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                  >
                    <span>{option.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </span>
        <span className="leading-none">Referral Leaders</span>
      </span>
    </h1>
  );
}

export function SortableLeaderboard({
  entries,
  filterControls,
  emptyMessage = "No referrals found.",
}: {
  entries: LeaderboardEntry[];
  filterControls?: ReactNode;
  emptyMessage?: string;
}) {
  const [sortMetric, setSortMetric] = useState<LeaderboardSortMetric>("verified");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement | null>(null);
  const {
    tableRef: leaderboardTableRef,
    stickyRef: leaderboardAvatarHeaderRef,
    adjacentRef: leaderboardReferrerHeaderRef,
    shiftPx: leaderboardHeaderShiftPx,
    labelWidthPx: leaderboardHeaderLabelWidthPx,
  } = useSlidingHeaderLabel(sortMetric);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const sortedEntries = useMemo(() => {
    const next = [...entries];
    if (sortMetric === "earned") {
      next.sort((a, b) => {
        if (b.totalEarnedToDate !== a.totalEarnedToDate) {
          return b.totalEarnedToDate - a.totalEarnedToDate;
        }
        if (b.verifiedReferrals !== a.verifiedReferrals) {
          return b.verifiedReferrals - a.verifiedReferrals;
        }
        return b.totalReferrals - a.totalReferrals;
      });
      return next;
    }

    next.sort((a, b) => {
      if (b.verifiedReferrals !== a.verifiedReferrals) {
        return b.verifiedReferrals - a.verifiedReferrals;
      }
      return b.totalReferrals - a.totalReferrals;
    });
    return next;
  }, [entries, sortMetric]);

  const selectedSortLabel =
    LEADERBOARD_SORT_OPTIONS.find((opt) => opt.value === sortMetric)?.label ?? "verified referrals";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-gray-900">
          Sort by{" "}
          <span ref={dropdownRef} className="relative inline-flex">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`group inline-flex items-center gap-1 font-semibold transition-colors ${
                dropdownOpen
                  ? "text-[var(--color-brand-blue)]"
                  : "text-gray-900 hover:text-[var(--color-brand-blue)]"
              }`}
            >
              <span className="underline underline-offset-2">{selectedSortLabel}</span>
              <span
                aria-hidden
                className={`${SORT_DROPDOWN_ARROW_CLASS} ${
                  dropdownOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                {"\u25BE"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute left-0 top-full z-[1001] mt-1 min-w-[200px]"
                >
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {LEADERBOARD_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortMetric(option.value);
                          setDropdownOpen(false);
                        }}
                        className={`group flex w-full items-center justify-between px-3 py-2 text-sm font-semibold transition-colors ${
                          option.value === sortMetric
                            ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"
                            : "cursor-pointer text-gray-800 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                        }`}
                      >
                        <span>{option.label}</span>
                        {option.value === sortMetric && <span className="text-xs">{"\u2713"}</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        </p>

        {filterControls ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {filterControls}
          </div>
        ) : null}
      </div>

      <LeaderboardTable
        key={`leaderboard-${sortMetric}`}
        totalRows={sortedEntries.length}
        tableRef={leaderboardTableRef}
        tableClassName="border border-gray-800 rounded-xl overflow-x-auto overflow-y-hidden scrollbar-visible"
        controlsMarginClassName="mt-8"
        header={(
          <div
            className={`grid ${LEADERBOARD_GRID_CLASSES} gap-0 bg-gray-100 text-[11px] md:text-sm lg:text-base font-semibold tracking-wide text-gray-700 border-b border-gray-300 ${LEADERBOARD_MIN_WIDTH_CLASS}`}
          >
            <div id="leader-col-rank" className="sticky left-0 z-20 bg-gray-100 px-2 py-2 border-r border-gray-300 text-center">Rank</div>
              <div
                ref={leaderboardAvatarHeaderRef}
                className="sticky left-[48px] md:left-[56px] z-20 bg-gray-100 px-2 py-2 text-center relative overflow-visible"
              >
              <span
                id="leader-col-referrer"
                className="absolute inset-y-0 left-0 inline-flex items-center justify-center whitespace-nowrap pointer-events-none"
                style={{ width: leaderboardHeaderLabelWidthPx || undefined }}
              >
                <span
                  className="inline-block"
                style={{ transform: `translateX(-${leaderboardHeaderShiftPx}px)` }}
                >
                  Referrer
                </span>
              </span>
            </div>
            <div ref={leaderboardReferrerHeaderRef} className="px-2 py-2 border-r border-gray-300" />
            <div id="leader-col-total" className="px-2 py-2 text-center">Total</div>
            <div id="leader-col-verif" className="px-2 py-2 text-center">Verif.</div>
            <div id="leader-col-eligible" className="px-2 py-2 text-center">Eligible</div>
            <div id="leader-col-active" className="px-2 py-2 text-center">Active</div>
            <div id="leader-col-earned" className="px-2 py-2 text-center">Earned (zats)</div>
          </div>
        )}
        emptyState={(
          <div className={`border-t border-b border-gray-100 px-3 py-6 text-center text-sm text-gray-600 ${LEADERBOARD_MIN_WIDTH_CLASS}`}>
            {emptyMessage}
          </div>
        )}
      >
        {sortedEntries.map((entry, index) => {
          const safeUsername = sanitizeUsernameInput(entry.referrerUsername);
          const displayRank = index + 1;

          return (
            <Link
              key={entry.referrerId}
              href={`/${safeUsername}`}
              className={`relative grid ${LEADERBOARD_GRID_CLASSES} gap-0 border-t border-b border-gray-100 text-xs sm:text-sm md:text-base ${LEADERBOARD_MIN_WIDTH_CLASS} transition-colors hover:z-10 hover:border-t-gray-400 hover:border-b-gray-400 cursor-pointer`}
            >
              <div className="sticky left-0 z-10 bg-[var(--color-background)] px-2 py-3 flex items-center justify-center text-center border-r border-gray-100">
                <span className={`font-bold ${displayRank <= 3 ? "text-base sm:text-lg" : "text-xs sm:text-sm text-gray-500"}`}>
                  {displayRank === 1 && "🥇"}
                  {displayRank === 2 && "🥈"}
                  {displayRank === 3 && "🥉"}
                  {displayRank > 3 && `${displayRank}`}
                </span>
              </div>

              <div className="sticky left-[48px] md:left-[56px] z-10 bg-[var(--color-background)] px-2 py-3 border-r border-gray-100 flex items-center justify-center">
                <LeaderAvatar
                  imageUrl={entry.referrerProfileImageUrl}
                  name={entry.referrerDisplayName}
                  size={28}
                />
              </div>

              <div className="px-2 py-3 min-w-0">
                <span className="block w-fit font-medium truncate text-xs sm:text-sm md:text-base">
                  {entry.referrerDisplayName}
                </span>
                <span className="block w-fit text-[10px] text-gray-500 truncate">
                  /{entry.referrerUsername}
                </span>
              </div>

              <div className="px-2 py-3 text-center font-medium">{entry.totalReferrals}</div>
              <div className="px-2 py-3 text-center font-medium text-green-600">{entry.verifiedReferrals}</div>
              <div className="px-2 py-3 text-center font-medium text-blue-600">{entry.eligibleCount}</div>
              <div className="px-2 py-3 text-center font-medium text-violet-600">{entry.activeRewardsCount}</div>
              <div className="px-2 py-3 text-center font-medium text-amber-600">{formatZats(entry.totalEarnedToDate)}</div>
            </Link>
          );
        })}
      </LeaderboardTable>
    </>
  );
}

type ReferrerStillActiveFlag = "YES" | "NO" | "N/A";

export interface ReferrerReferralRow {
  id: number;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  addressVerified: boolean;
  createdAt: string;
  firstVerifiedAt: string | null;
  eligibleUntil: string;
  eligibleFlag: boolean;
  rewardsActivated: boolean;
  totalLinksCount: number;
  verifiedLinksCount: number;
  activationExpiryDate: string | null;
  stillActive: ReferrerStillActiveFlag;
  earnedZats: number;
}

type ReferrerSortField = "joined" | "earned" | "eligibleUntil" | "activeUntil";
type SortDirection = "asc" | "desc";
type ReferrerSummaryFilter = "all" | "verified" | "eligible" | "active" | "earned";

interface ReferrerSortRule {
  field: ReferrerSortField;
  direction: SortDirection;
}

const REFERRER_SORT_OPTIONS: Array<{ value: ReferrerSortField; label: string }> = [
  { value: "joined", label: "joined" },
  { value: "earned", label: "earnings (zats)" },
  { value: "eligibleUntil", label: "eligible until" },
  { value: "activeUntil", label: "active until" },
];

const REFERRER_GRID_CLASSES =
  "grid-cols-[48px_58px_180px_96px_86px_98px_96px_92px_110px] md:grid-cols-[56px_64px_minmax(210px,2fr)_repeat(6,minmax(88px,1fr))]";
const REFERRER_MIN_WIDTH_CLASS = "min-w-[1028px]";
const RAW_PROFILE_BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() ?? "zcash.me";
const PROFILE_BASE_DOMAIN = RAW_PROFILE_BASE_DOMAIN
  .replace(/^https?:\/\//i, "")
  .replace(/\/+$/, "");
const PROFILE_ORIGIN = PROFILE_BASE_DOMAIN.includes("localhost") || PROFILE_BASE_DOMAIN.endsWith(".local")
  ? `http://${PROFILE_BASE_DOMAIN}`
  : `https://${PROFILE_BASE_DOMAIN}`;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  const monthAbbr = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}${monthAbbr}${day}`;
}

function formatZatsInteger(zats: number): string {
  return Math.round(zats).toLocaleString("en-US");
}

function parseDateTs(input: string | null | undefined): number {
  if (!input) return Number.NaN;
  const ts = new Date(input).getTime();
  return Number.isFinite(ts) ? ts : Number.NaN;
}

function getReferrerSortValue(row: ReferrerReferralRow, field: ReferrerSortField): number {
  if (field === "joined") {
    return parseDateTs(row.createdAt);
  }
  if (field === "earned") {
    return row.earnedZats;
  }
  if (field === "eligibleUntil") {
    return parseDateTs(row.eligibleUntil);
  }
  return parseDateTs(row.activationExpiryDate);
}

function compareSortValues(a: number, b: number, direction: SortDirection): number {
  const aMissing = !Number.isFinite(a);
  const bMissing = !Number.isFinite(b);

  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  if (a === b) return 0;
  return direction === "asc" ? a - b : b - a;
}

function getEligibleState(row: ReferrerReferralRow, nowTs: number): {
  variant: "info" | "neutral";
  label: string;
  isPendingYes: boolean;
  hasFirstVerified: boolean;
  eligibleUntilTs: number;
} {
  const joinedTs = new Date(row.createdAt).getTime();
  const eligibleUntilTs = new Date(row.eligibleUntil).getTime();
  const firstVerifiedTs = row.firstVerifiedAt ? new Date(row.firstVerifiedAt).getTime() : NaN;
  const hasFirstVerified = Number.isFinite(firstVerifiedTs);

  const verifiedWithinEligibleWindow =
    hasFirstVerified && firstVerifiedTs >= joinedTs && firstVerifiedTs <= eligibleUntilTs;
  const pendingEligibleWindow =
    !hasFirstVerified &&
    Number.isFinite(joinedTs) &&
    Number.isFinite(eligibleUntilTs) &&
    nowTs > joinedTs &&
    nowTs < eligibleUntilTs;

  if (verifiedWithinEligibleWindow) {
    return { variant: "info", label: "\u2713", isPendingYes: false, hasFirstVerified, eligibleUntilTs };
  }
  if (pendingEligibleWindow) {
    return { variant: "info", label: "Yes", isPendingYes: true, hasFirstVerified, eligibleUntilTs };
  }
  return { variant: "neutral", label: "No", isPendingYes: false, hasFirstVerified, eligibleUntilTs };
}

export function ReferrerReferralsTable({ referrals }: { referrals: ReferrerReferralRow[] }) {
  const [sortRules, setSortRules] = useState<ReferrerSortRule[]>([{ field: "earned", direction: "desc" }]);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState<ReferrerSummaryFilter>("all");
  const sortMenuRef = useRef<HTMLSpanElement | null>(null);
  const headerRebindKey = `${summaryFilter}:${sortRules.map((rule) => `${rule.field}-${rule.direction}`).join("_")}`;
  const {
    tableRef: referralsTableRef,
    stickyRef: referralsAvatarHeaderRef,
    adjacentRef: referralsUserHeaderRef,
    shiftPx: referralsHeaderShiftPx,
    labelWidthPx: referralsHeaderLabelWidthPx,
  } = useSlidingHeaderLabel(headerRebindKey);

  useEffect(() => {
    if (!sortMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sortMenuOpen]);

  const filteredReferrals = useMemo(() => {
    if (summaryFilter === "all") {
      return referrals;
    }

    const nowTs = Date.now();
    return referrals.filter((row) => {
      if (summaryFilter === "verified") {
        return row.addressVerified;
      }
      if (summaryFilter === "eligible") {
        return getEligibleState(row, nowTs).label !== "No";
      }
      if (summaryFilter === "active") {
        return row.stillActive === "YES";
      }
      return row.earnedZats > 0;
    });
  }, [referrals, summaryFilter]);

  const sortedReferrals = useMemo(() => {
    const next = [...filteredReferrals];
    const byNewest = (a: ReferrerReferralRow, b: ReferrerReferralRow) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    if (sortRules.length === 0) return next;

    next.sort((a, b) => {
      for (const rule of sortRules) {
        const comparison = compareSortValues(
          getReferrerSortValue(a, rule.field),
          getReferrerSortValue(b, rule.field),
          rule.direction,
        );
        if (comparison !== 0) return comparison;
      }
      return byNewest(a, b);
    });

    return next;
  }, [filteredReferrals, sortRules]);

  const summary = useMemo(() => {
    const nowTs = Date.now();
    let verified = 0;
    let eligible = 0;
    let active = 0;
    let totalEarnedZats = 0;

    for (const row of referrals) {
      if (row.addressVerified) verified++;
      const eligibleState = getEligibleState(row, nowTs);
      if (eligibleState.label !== "No") eligible++;
      if (row.stillActive === "YES") active++;
      totalEarnedZats += row.earnedZats;
    }

    return {
      total: referrals.length,
      verified,
      eligible,
      active,
      totalEarnedZats,
    };
  }, [referrals]);

  const selectedSortLabel = sortRules.length === 0
    ? "none"
    : sortRules
        .map((rule) => {
          const label = REFERRER_SORT_OPTIONS.find((option) => option.value === rule.field)?.label ?? rule.field;
          return `${label} (${rule.direction})`;
        })
        .join(", ");

  const summaryCardClass = (filter: ReferrerSummaryFilter): string => {
    const base = "rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]";
    if (summaryFilter === filter && filter !== "all") {
      return `${base} border-[var(--color-brand-blue)] !bg-[var(--color-brand-blue)]/5 hover:!bg-[var(--color-brand-blue)]/5 ring-2 ring-[var(--color-brand-blue)]/30`;
    }
    if (summaryFilter === filter) {
      return `${base} border-gray-800 !bg-gray-100/60 hover:!bg-gray-100/60`;
    }
    return `${base} border-gray-800 bg-transparent hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/5`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setSummaryFilter((prev) => (prev === "earned" ? "all" : "earned"))}
          aria-pressed={summaryFilter === "earned"}
          className={`col-span-2 sm:col-span-1 ${summaryCardClass("earned")}`}
        >
          <p className="text-sm text-gray-600 mb-1">Earned (zats)</p>
          <p className="text-2xl font-bold text-amber-600">{formatZatsInteger(summary.totalEarnedZats)}</p>
        </button>
        <button
          type="button"
          onClick={() => setSummaryFilter("all")}
          aria-pressed={summaryFilter === "all"}
          className={summaryCardClass("all")}
        >
          <p className="text-sm text-gray-600 mb-1">Referrals</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setSummaryFilter((prev) => (prev === "verified" ? "all" : "verified"))}
          aria-pressed={summaryFilter === "verified"}
          className={summaryCardClass("verified")}
        >
          <p className="text-sm text-gray-600 mb-1">Verif. Refs</p>
          <p className="text-2xl font-bold text-green-600">{summary.verified}</p>
        </button>
        <button
          type="button"
          onClick={() => setSummaryFilter((prev) => (prev === "eligible" ? "all" : "eligible"))}
          aria-pressed={summaryFilter === "eligible"}
          className={summaryCardClass("eligible")}
        >
          <p className="text-sm text-gray-600 mb-1">Eligible</p>
          <p className="text-2xl font-bold text-blue-600">{summary.eligible}</p>
        </button>
        <button
          type="button"
          onClick={() => setSummaryFilter((prev) => (prev === "active" ? "all" : "active"))}
          aria-pressed={summaryFilter === "active"}
          className={summaryCardClass("active")}
        >
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-violet-600">{summary.active}</p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-lg font-semibold text-gray-900">
          Sort by{" "}
          <span ref={sortMenuRef} className="relative inline-flex">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              onClick={() => setSortMenuOpen((prev) => !prev)}
              className={`group inline-flex items-center gap-1 font-semibold transition-colors ${
                sortMenuOpen
                  ? "text-[var(--color-brand-blue)]"
                  : "text-gray-900 hover:text-[var(--color-brand-blue)]"
              }`}
            >
              <span className="underline underline-offset-2">{selectedSortLabel}</span>
              <span
                aria-hidden
                className={`${SORT_DROPDOWN_ARROW_CLASS} ${
                  sortMenuOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                {"\u25BE"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {sortMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute left-0 top-full z-[1001] mt-1 min-w-[200px]"
                >
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    {REFERRER_SORT_OPTIONS.map((option) => {
                      const activeRule = sortRules.find((rule) => rule.field === option.value);
                      const sortIndex = sortRules.findIndex((rule) => rule.field === option.value);
                      const statusLabel = activeRule
                        ? `${activeRule.direction.toUpperCase()}${sortIndex >= 0 ? ` #${sortIndex + 1}` : ""}`
                        : "";

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortRules((prev) => {
                              const existing = prev.find((rule) => rule.field === option.value);
                              if (!existing) {
                                return [...prev, { field: option.value, direction: "asc" }];
                              }
                              if (existing.direction === "asc") {
                                return prev.map((rule) =>
                                  rule.field === option.value
                                    ? { ...rule, direction: "desc" }
                                    : rule
                                );
                              }
                              return prev.filter((rule) => rule.field !== option.value);
                            });
                          }}
                          className={`group flex w-full items-center justify-between px-3 py-2 text-sm font-semibold transition-colors ${
                            activeRule
                              ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"
                              : "cursor-pointer text-gray-800 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                          }`}
                        >
                          <span>{option.label}</span>
                          <span className="text-[11px]">{statusLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        </p>
      </div>

      <LeaderboardTable
          key={`referrals-${sortRules.map((rule) => `${rule.field}-${rule.direction}`).join("_")}-${summaryFilter}`}
          totalRows={sortedReferrals.length}
          tableRef={referralsTableRef}
          tableClassName="border border-gray-800 rounded-xl overflow-x-auto overflow-y-hidden scrollbar-visible"
          controlsMarginClassName="mt-8"
          header={(
            <div
              className={`grid ${REFERRER_GRID_CLASSES} gap-0 bg-gray-100 text-[11px] md:text-sm font-semibold tracking-wide text-gray-700 border-b border-gray-300 ${REFERRER_MIN_WIDTH_CLASS}`}
            >
              <div className="sticky left-0 z-20 bg-gray-100 px-2 py-2 border-r border-gray-300 text-center">Rank</div>
              <div
                ref={referralsAvatarHeaderRef}
                className="sticky left-[48px] md:left-[56px] z-20 bg-gray-100 px-3 py-2 text-center relative overflow-visible"
              >
                <span
                  className="absolute inset-y-0 left-0 inline-flex items-center justify-center whitespace-nowrap pointer-events-none"
                  style={{ width: referralsHeaderLabelWidthPx || undefined }}
                >
                  <span
                    className="inline-block"
                    style={{ transform: `translateX(-${referralsHeaderShiftPx}px)` }}
                  >
                    User
                  </span>
                </span>
              </div>
              <div ref={referralsUserHeaderRef} className="px-3 py-2 border-r border-gray-300" />
              <div className="px-3 py-2 text-center">Elig. Until</div>
              <div className="px-3 py-2 text-center">Eligible</div>
              <div className="px-3 py-2 text-center">First Verif.</div>
              <div className="px-3 py-2 text-center">Auth/Links</div>
              <div className="px-3 py-2 text-center">Active Until</div>
              <div className="px-3 py-2 text-center">Commission</div>
            </div>
          )}
          emptyState={(
            <div className={`border-t border-b border-gray-100 px-3 py-6 text-center text-sm text-gray-600 ${REFERRER_MIN_WIDTH_CLASS}`}>
              No referrals match current filters.
            </div>
          )}
        >
          {sortedReferrals.map((row, index) => {
            const profileSlug = buildSlug({
              id: row.id,
              name: row.username,
              address_verified: row.addressVerified,
            });
            const userHref = `${PROFILE_ORIGIN}/${profileSlug || sanitizeUsernameInput(row.username)}`;
            const displayIndex = index + 1;
            const usernameWithDiscriminator = row.addressVerified
              ? row.username
              : `${row.username}-${row.id}`;
            const nowTs = Date.now();
            const eligibleState = getEligibleState(row, nowTs);
            const activeUntilLabel = row.activationExpiryDate
              ? formatDate(row.activationExpiryDate)
              : !eligibleState.hasFirstVerified && nowTs > eligibleState.eligibleUntilTs
                ? "N/a"
                : "—";

            return (
              <Link
                key={row.id}
                href={userHref}
                className={`relative grid ${REFERRER_GRID_CLASSES} gap-0 border-t border-b border-gray-100 text-xs sm:text-sm md:text-base ${REFERRER_MIN_WIDTH_CLASS} transition-colors hover:z-10 hover:border-t-gray-400 hover:border-b-gray-400 cursor-pointer`}
              >
                <div className="sticky left-0 z-10 bg-[var(--color-background)] px-2 py-3 flex items-center justify-center text-center border-r border-gray-100">
                  <span className={`font-bold ${displayIndex <= 3 ? "text-base sm:text-lg" : "text-xs sm:text-sm text-gray-500"}`}>
                    {displayIndex === 1 && "🥇"}
                    {displayIndex === 2 && "🥈"}
                    {displayIndex === 3 && "🥉"}
                    {displayIndex > 3 && `${displayIndex}`}
                  </span>
                </div>
                <div className="sticky left-[48px] md:left-[56px] z-10 bg-[var(--color-background)] px-3 py-3 border-r border-gray-100 flex items-center justify-center">
                  <LeaderAvatar
                    imageUrl={row.profileImageUrl}
                    name={row.displayName}
                    size={32}
                  />
                </div>
                <div className="px-3 py-3 min-w-0">
                  <span className="block w-fit font-medium truncate text-sm md:text-base">{row.displayName}</span>
                  <span className="block w-fit text-xs md:text-sm text-gray-500 truncate">
                    /{usernameWithDiscriminator}
                  </span>
                </div>

                <div className="px-3 py-3 text-center text-gray-600 self-center">{formatDate(row.eligibleUntil)}</div>
                <div className="px-3 py-3 text-center self-center text-blue-600">
                  <Badge variant={eligibleState.variant} size="xs">
                    {eligibleState.label}
                  </Badge>
                </div>
                <div className="px-3 py-3 text-center text-gray-600 self-center">
                  {row.firstVerifiedAt ? formatDate(row.firstVerifiedAt) : "—"}
                </div>
                <div className="px-3 py-3 text-center text-green-600 self-center">
                  {row.verifiedLinksCount}/{row.totalLinksCount}
                </div>
                <div className="px-3 py-3 text-center text-violet-600 self-center">
                  {activeUntilLabel}
                </div>
                <div className="px-3 py-3 text-center self-center font-medium text-amber-600">
                  {row.earnedZats > 0 ? formatZatsInteger(row.earnedZats) : "—"}
                </div>
              </Link>
            );
          })}
      </LeaderboardTable>
    </div>
  );
}

// ── ClickStopLink ─────────────────────────────────────────────
// A Link that stops click propagation — safe to render from server
// components that get passed as props to client components.

export function ClickStopLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

// ── FAQ Accordion ──────────────────────────────────────────────

interface FAQItem {
  id: string;
  question: string;
  answer: string | ReactNode;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="group overflow-hidden bg-transparent border-b border-transparent transition-colors hover:border-[var(--color-brand-blue)]"
        >
          <button
            type="button"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:text-[var(--color-brand-blue)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{item.question}</span>
              <motion.span
                animate={{ rotate: openId === item.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center justify-center text-base leading-none text-gray-600 shrink-0 transition-colors group-hover:text-[var(--color-brand-blue)]"
              >
                {"\u25BE"}
              </motion.span>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 text-base font-normal text-gray-700">{item.answer}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

