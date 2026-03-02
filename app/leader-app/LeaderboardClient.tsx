"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import Badge from "@/ui/common/feedback/Badge";
import type { LeaderboardEntry } from "@/lib/leaderboard/getLeaderboardAction";
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

export function LeaderboardTable({
  children,
  totalRows,
  header,
  tableClassName,
  controlsMarginClassName = "mt-8",
}: {
  children: ReactNode[];
  totalRows: number;
  header?: ReactNode;
  tableClassName?: string;
  controlsMarginClassName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_ROWS);

  const visibleChildren = children.slice(0, visibleCount);
  const hasMore = visibleCount < totalRows;

  return (
    <div className="flex flex-col">
      <div className={tableClassName}>
        {header}
        {visibleChildren}
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
  "grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)]";

function formatZats(value: number): string {
  return Math.round(value * 100000000).toLocaleString("en-US");
}

export function SortableLeaderboard({
  entries,
  filterControls,
}: {
  entries: LeaderboardEntry[];
  filterControls?: ReactNode;
}) {
  const [sortMetric, setSortMetric] = useState<LeaderboardSortMetric>("verified");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement | null>(null);

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
                className={`inline-block text-base leading-none text-current transition-transform duration-200 ${
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
        tableClassName="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto"
        controlsMarginClassName="mt-8"
        header={(
          <div
            className={`grid ${LEADERBOARD_GRID_CLASSES} gap-0 bg-gray-100 text-[11px] md:text-sm lg:text-base font-semibold tracking-wide text-gray-700 border-b border-gray-300 min-w-[642px]`}
          >
            <div id="leader-col-rank" className="sticky left-0 z-20 bg-gray-100 px-2 py-2 border-r border-gray-300 text-center">Rank</div>
            <div id="leader-col-referrer" className="sticky left-[48px] md:left-[56px] z-20 bg-gray-100 px-2 py-2 border-r border-gray-300 text-center">Referrer</div>
            <div id="leader-col-total" className="px-2 py-2 text-center">Total</div>
            <div id="leader-col-verif" className="px-2 py-2 text-center">Verif.</div>
            <div id="leader-col-eligible" className="px-2 py-2 text-center">Eligible</div>
            <div id="leader-col-active" className="px-2 py-2 text-center">Active</div>
            <div id="leader-col-earned" className="px-2 py-2 text-center">Earned (zats)</div>
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
              className={`relative grid ${LEADERBOARD_GRID_CLASSES} gap-0 border-t border-b border-gray-100 text-xs sm:text-sm md:text-base min-w-[642px] transition-colors hover:z-10 hover:border-t-gray-400 hover:border-b-gray-400 cursor-pointer`}
            >
              <div className="sticky left-0 z-10 bg-[var(--color-background)] px-2 py-3 flex items-center justify-center text-center border-r border-gray-100">
                <span className={`font-bold ${displayRank <= 3 ? "text-base sm:text-lg" : "text-xs sm:text-sm text-gray-500"}`}>
                  {displayRank === 1 && "🥇"}
                  {displayRank === 2 && "🥈"}
                  {displayRank === 3 && "🥉"}
                  {displayRank > 3 && `${displayRank}`}
                </span>
              </div>

              <div className="sticky left-[48px] md:left-[56px] z-10 bg-[var(--color-background)] px-2 py-3 border-r border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">
                    <LeaderAvatar
                      imageUrl={entry.referrerProfileImageUrl}
                      name={entry.referrerDisplayName}
                      size={28}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block w-fit font-medium truncate text-xs sm:text-sm md:text-base">
                      {entry.referrerDisplayName}
                    </span>
                    <span className="block w-fit text-[10px] text-gray-500 truncate">
                      /{entry.referrerUsername}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-2 py-3 text-center font-medium">{entry.totalReferrals}</div>
              <div className="px-2 py-3 text-center font-medium text-green-600">{entry.verifiedReferrals}</div>
              <div className="px-2 py-3 text-center font-medium text-[var(--color-brand-blue)]">{entry.eligibleCount}</div>
              <div className="px-2 py-3 text-center font-medium text-purple-600">{entry.activeRewardsCount}</div>
              <div className="px-2 py-3 text-center font-medium text-green-700">{formatZats(entry.totalEarnedToDate)}</div>
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

type ReferrerSortMetric = "joined" | "earned" | "eligible" | "activated" | "active";

const REFERRER_SORT_OPTIONS: Array<{ value: ReferrerSortMetric; label: string }> = [
  { value: "joined", label: "joined" },
  { value: "earned", label: "earned (zats)" },
  { value: "eligible", label: "eligible" },
  { value: "activated", label: "activated" },
  { value: "active", label: "active" },
];

const REFERRER_GRID_CLASSES =
  "grid-cols-[180px_96px_86px_98px_96px_92px_100px] md:grid-cols-[minmax(210px,2fr)_repeat(6,minmax(88px,1fr))]";
const REFERRER_MIN_WIDTH_CLASS = "min-w-[900px]";

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

function activeRank(flag: ReferrerStillActiveFlag): number {
  if (flag === "YES") return 2;
  if (flag === "NO") return 1;
  return 0;
}

function getEligibleState(row: ReferrerReferralRow, nowTs: number): {
  variant: "success" | "warning" | "neutral";
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
    return { variant: "success", label: "\u2713", isPendingYes: false, hasFirstVerified, eligibleUntilTs };
  }
  if (pendingEligibleWindow) {
    return { variant: "warning", label: "Yes", isPendingYes: true, hasFirstVerified, eligibleUntilTs };
  }
  return { variant: "neutral", label: "No", isPendingYes: false, hasFirstVerified, eligibleUntilTs };
}

export function ReferrerReferralsTable({ referrals }: { referrals: ReferrerReferralRow[] }) {
  const [sortMetric, setSortMetric] = useState<ReferrerSortMetric>("earned");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterEligible, setFilterEligible] = useState(false);
  const [filterActivated, setFilterActivated] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const sortMenuRef = useRef<HTMLSpanElement | null>(null);

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
    if (!filterEligible && !filterActivated && !filterActive) {
      return referrals;
    }

    const nowTs = Date.now();
    return referrals.filter((row) => {
      const eligibleState = getEligibleState(row, nowTs);
      const passesEligible = !filterEligible || eligibleState.isPendingYes;
      const passesActivated = !filterActivated || row.rewardsActivated;
      const passesActive = !filterActive || row.stillActive === "YES";
      return passesEligible && passesActivated && passesActive;
    });
  }, [filterActive, filterActivated, filterEligible, referrals]);

  const sortedReferrals = useMemo(() => {
    const next = [...filteredReferrals];
    const byNewest = (a: ReferrerReferralRow, b: ReferrerReferralRow) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    next.sort((a, b) => {
      if (sortMetric === "earned") {
        if (b.earnedZats !== a.earnedZats) return b.earnedZats - a.earnedZats;
        return byNewest(a, b);
      }

      if (sortMetric === "eligible") {
        if (Number(b.eligibleFlag) !== Number(a.eligibleFlag)) {
          return Number(b.eligibleFlag) - Number(a.eligibleFlag);
        }
        return byNewest(a, b);
      }

      if (sortMetric === "activated") {
        if (Number(b.rewardsActivated) !== Number(a.rewardsActivated)) {
          return Number(b.rewardsActivated) - Number(a.rewardsActivated);
        }
        return byNewest(a, b);
      }

      if (sortMetric === "active") {
        if (activeRank(b.stillActive) !== activeRank(a.stillActive)) {
          return activeRank(b.stillActive) - activeRank(a.stillActive);
        }
        return byNewest(a, b);
      }

      return byNewest(a, b);
    });

    return next;
  }, [filteredReferrals, sortMetric]);

  const selectedSortLabel =
    REFERRER_SORT_OPTIONS.find((option) => option.value === sortMetric)?.label ?? "earned (zats)";

  const filterButtonClass = (active: boolean): string =>
    `rounded-xl border px-3 py-2 text-sm font-normal transition-colors ${
      active
        ? "border-[var(--color-brand-blue)] text-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10"
        : "border-gray-800 bg-transparent text-gray-900 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                className={`inline-block text-base leading-none text-current transition-transform duration-200 ${
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
                    {REFERRER_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortMetric(option.value);
                          setSortMenuOpen(false);
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className={filterButtonClass(filterEligible)}
            onClick={() => setFilterEligible((prev) => !prev)}
          >
            Eligible
          </button>
          <button
            type="button"
            className={filterButtonClass(filterActivated)}
            onClick={() => setFilterActivated((prev) => !prev)}
          >
            Activated
          </button>
          <button
            type="button"
            className={filterButtonClass(filterActive)}
            onClick={() => setFilterActive((prev) => !prev)}
          >
            Active
          </button>
        </div>
      </div>

      {sortedReferrals.length === 0 ? (
        <div className="border border-gray-800 rounded-xl p-6">
          <p className="text-gray-600 text-center py-8">No referrals match current filters.</p>
        </div>
      ) : (
        <LeaderboardTable
          key={`referrals-${sortMetric}-${filterEligible}-${filterActivated}-${filterActive}`}
          totalRows={sortedReferrals.length}
          tableClassName="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto"
          controlsMarginClassName="mt-8"
          header={(
            <div
              className={`grid ${REFERRER_GRID_CLASSES} gap-0 bg-gray-100 text-[11px] md:text-sm font-semibold tracking-wide text-gray-700 border-b border-gray-300 ${REFERRER_MIN_WIDTH_CLASS}`}
            >
              <div className="sticky left-0 z-20 bg-gray-100 px-3 py-2 border-r border-gray-300 text-center">User</div>
              <div className="px-3 py-2 text-center">Elig. Until</div>
              <div className="px-3 py-2 text-center">Eligible</div>
              <div className="px-3 py-2 text-center">First Verif.</div>
              <div className="px-3 py-2 text-center">Auth/Links</div>
              <div className="px-3 py-2 text-center">Active Until</div>
              <div className="px-3 py-2 text-center">Earned (zats)</div>
            </div>
          )}
        >
          {sortedReferrals.map((row) => {
            const userHref = `/${sanitizeUsernameInput(row.username)}`;
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
                <div className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-3 flex items-center gap-2 min-w-0 border-r border-gray-100">
                  <div className="shrink-0">
                    <LeaderAvatar
                      imageUrl={row.profileImageUrl}
                      name={row.displayName}
                      size={32}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block w-fit font-medium truncate text-sm md:text-base">{row.displayName}</span>
                    <span className="block w-fit text-xs md:text-sm text-gray-500 truncate">
                      /{usernameWithDiscriminator}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-3 text-center text-gray-600 self-center">{formatDate(row.eligibleUntil)}</div>
                <div className="px-3 py-3 text-center self-center">
                  <Badge variant={eligibleState.variant} size="xs">
                    {eligibleState.label}
                  </Badge>
                </div>
                <div className="px-3 py-3 text-center text-gray-600 self-center">
                  {row.firstVerifiedAt ? formatDate(row.firstVerifiedAt) : "—"}
                </div>
                <div className="px-3 py-3 text-center text-gray-600 self-center">
                  {row.verifiedLinksCount}/{row.totalLinksCount}
                </div>
                <div className="px-3 py-3 text-center text-gray-600 self-center">
                  {activeUntilLabel}
                </div>
                <div className="px-3 py-3 text-center self-center font-medium">
                  {row.earnedZats > 0 ? formatZatsInteger(row.earnedZats) : "—"}
                </div>
              </Link>
            );
          })}
        </LeaderboardTable>
      )}
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
            className="w-full px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:text-[var(--color-brand-blue)] flex items-center justify-between"
          >
            <span>{item.question}</span>
            <motion.span
              animate={{ rotate: openId === item.id ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-600 shrink-0 ml-2 transition-colors group-hover:text-[var(--color-brand-blue)]"
            >
              ▼
            </motion.span>
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

