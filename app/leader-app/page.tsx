"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Spinner, Badge } from "@/ui/common";
import {
  getLeaderboardAction,
  type Period,
  type LeaderboardEntry,
} from "@/lib/leaderboard/getLeaderboardAction";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "alltime", label: "All Time" },
];
const ROWS_PER_PAGE = 10;

function ZecMark({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M56 56 H200 L56 200 H200" />
        <path d="M128 32 V224" />
      </g>
    </svg>
  );
}

function formatZecNumber(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

function formatZec(value: number): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <ZecMark />
      <span>{formatZecNumber(value)}</span>
    </span>
  );
}

function formatZats(value: number): string {
  return Math.round(value * 100000000).toLocaleString("en-US");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function PodiumAvatar({
  entry,
  emoji,
  sizeClassName,
  initialsClassName,
  borderClassName,
}: {
  entry: LeaderboardEntry;
  emoji: string;
  sizeClassName: string;
  initialsClassName: string;
  borderClassName: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const profileHref = `http://localhost:3000/${encodeURIComponent(entry.referrerUsername)}`;
  return (
    <div className={`relative ${sizeClassName} transition-transform duration-150 hover:scale-110`}>
      <Link
        href={profileHref}
        className={`relative block h-full w-full rounded-full overflow-hidden bg-gray-100 ${borderClassName}`}
        aria-label={`View ${entry.referrerUsername}`}
      >
        {entry.referrerProfileImageUrl ? (
          <>
            <span className={`flex h-full w-full items-center justify-center ${initialsClassName}`}>
              {getInitials(entry.referrerDisplayName)}
            </span>
            <img
              src={entry.referrerProfileImageUrl}
              alt={entry.referrerDisplayName}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${initialsClassName}`}>
            {getInitials(entry.referrerDisplayName)}
          </span>
        )}
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

function ReferrerAvatar({
  entry,
  className,
}: {
  entry: LeaderboardEntry;
  className: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <div className={`${className} relative shrink-0 rounded-full overflow-hidden bg-gray-100 border border-gray-300`}>
      {entry.referrerProfileImageUrl ? (
        <>
          <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-700">
            {getInitials(entry.referrerDisplayName)}
          </span>
          <img
            src={entry.referrerProfileImageUrl}
            alt={entry.referrerDisplayName}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </>
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-700">
          {getInitials(entry.referrerDisplayName)}
        </span>
      )}
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  base: "bg-gray-100 text-gray-700",
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
};

const TIER_LABELS: Record<string, string> = {
  base: "Base",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

type SummaryStatId =
  | "totalReferrers"
  | "totalReferrals"
  | "verified"
  | "eligible"
  | "activeRewards"
  | "totalEarned";

const SUMMARY_STAT_DETAILS: Record<SummaryStatId, { title: string; description: string; formula: string }> = {
  totalReferrers: {
    title: "Total Referrers",
    description: "How many unique referrer profiles currently appear in the leaderboard.",
    formula: "Total Referrers = count(entries)",
  },
  totalReferrals: {
    title: "Total Referrals",
    description: "Sum of all referrals attributed across every referrer in the current period.",
    formula: "Total Referrals = sum(entry.totalReferrals for each entry)",
  },
  verified: {
    title: "Verified",
    description: "Number of referred users whose address verification is complete.",
    formula: "Verified = sum(entry.verifiedReferrals for each entry)",
  },
  eligible: {
    title: "Eligible",
    description: "Number of verified referrals that completed verification inside the eligibility window.",
    formula: "Eligible = sum(entry.eligibleCount for each entry)",
  },
  activeRewards: {
    title: "Active Rewards",
    description: "Number of eligible referrals still inside their reward payout duration.",
    formula: "Active Rewards = sum(entry.activeRewardsCount for each entry)",
  },
  totalEarned: {
    title: "Total Earned (ZEC)",
    description: "Total ZEC already earned so far by all referrers from active and completed payout months.",
    formula: "Total Earned = sum(entry.totalEarnedToDate for each entry)",
  },
};

const TABLE_COLUMN_DETAILS: Array<{ id: string; label: string; description: string; formula: string }> = [
  {
    id: "leader-col-total",
    label: "Total",
    description: "All referrals attributed to a referrer in the selected period.",
    formula: "Total = verifiedReferrals + unverifiedReferrals",
  },
  {
    id: "leader-col-verif",
    label: "Verif.",
    description: "Referrals that completed address verification.",
    formula: "Verified = count(referrals where address_verified = true)",
  },
  {
    id: "leader-col-eligible",
    label: "Eligible",
    description: "Verified referrals that completed verification within the eligibility window.",
    formula: "Eligible = count(verified where verifiedAt <= signupAt + eligibilityWindow)",
  },
  {
    id: "leader-col-active",
    label: "Active",
    description: "Eligible referrals still inside the reward payout duration.",
    formula: "Active = count(eligible where now < verifiedAt + rewardDurationMonths)",
  },
  {
    id: "leader-col-earned",
    label: "Earned (zats)",
    description: "Lifetime earned converted from ZEC to zatoshis.",
    formula: "totalEarnedToDate = sum(min(monthsBetween(lastVerifiedAt, now), rewardDurationMonths) * (verificationFeeZec * lockedCommissionRate)); Earned (zats) = round(totalEarnedToDate * 100,000,000)",
  },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("alltime");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummaryStatId, setSelectedSummaryStatId] = useState<SummaryStatId | null>(null);
  const [showAssumptionDetails, setShowAssumptionDetails] = useState(false);
  const [visibleRowsCount, setVisibleRowsCount] = useState(ROWS_PER_PAGE);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [constants, setConstants] = useState<{
    eligibilityWindowWeeks: number;
    rewardDurationMonths: number;
    baseCommissionRate: number;
    commissionDeltaPerLink: number;
    maxCommissionRate: number;
    verificationFeeZec: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await getLeaderboardAction(period);
    if (response.ok) {
      setEntries(response.data);
      setConstants(response.constants);
    } else {
      setError(response.error || "Failed to load leaderboard");
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setVisibleRowsCount(ROWS_PER_PAGE);
  }, [period]);

  useEffect(() => {
    if (!selectedSummaryStatId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedSummaryStatId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSummaryStatId]);

  useEffect(() => {
    if (!isPeriodDropdownOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!periodDropdownRef.current) return;
      if (!periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isPeriodDropdownOpen]);

  const totalReferrals = entries.reduce((sum, e) => sum + e.totalReferrals, 0);
  const totalVerified = entries.reduce((sum, e) => sum + e.verifiedReferrals, 0);
  const totalEligible = entries.reduce((sum, e) => sum + e.eligibleCount, 0);
  const totalActiveRewards = entries.reduce((sum, e) => sum + e.activeRewardsCount, 0);
  const totalEarned = entries.reduce((sum, e) => sum + e.totalEarnedToDate, 0);

  const summaryStats: Array<{
    id: SummaryStatId;
    label: string;
    value: ReactNode;
    valueClassName?: string;
  }> = [
    { id: "totalReferrers", label: "Total Referrers", value: entries.length },
    { id: "totalReferrals", label: "Total Referrals", value: totalReferrals },
    { id: "verified", label: "Verified", value: totalVerified, valueClassName: "text-green-600" },
    { id: "eligible", label: "Eligible", value: totalEligible, valueClassName: "text-blue-600" },
    { id: "activeRewards", label: "Active Rewards", value: totalActiveRewards, valueClassName: "text-purple-600" },
    { id: "totalEarned", label: "Total Earned (ZEC)", value: formatZec(totalEarned), valueClassName: "text-green-700" },
  ];
  const activePeriodLabel =
    PERIODS.find((periodOption) => periodOption.value === period)?.label ?? "All Time";
  const firstPlace = entries[0];
  const secondPlace = entries[1];
  const thirdPlace = entries[2];
  const visibleEntries = entries.slice(0, visibleRowsCount);
  const hasMoreRows = visibleRowsCount < entries.length;
  const visibleEntryChunks: LeaderboardEntry[][] = [];
  for (let i = 0; i < visibleEntries.length; i += ROWS_PER_PAGE) {
    visibleEntryChunks.push(visibleEntries.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {loading && (
        <div className="fixed inset-0 z-[10001] pointer-events-none flex items-center justify-center">
          <Spinner size="xl" color="blue" />
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        {loading && (
          <div className="relative mb-6 h-24 sm:h-28 w-full" style={{ transform: "translateY(10px)" }}>
            <div className="relative z-10 flex h-full items-center justify-center gap-2 sm:gap-3">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-gray-800 bg-transparent" />
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-gray-900 bg-transparent" />
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-gray-700 bg-transparent" />
            </div>
          </div>
        )}

        {!loading && !error && firstPlace && (
          <div className="relative mb-6 h-24 sm:h-28 w-full" style={{ transform: "translateY(10px)" }}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-black" />
            <div className="relative z-10 flex h-full items-center justify-center gap-2 sm:gap-3">
              {secondPlace && (
                <PodiumAvatar
                  entry={secondPlace}
                  emoji="🥈"
                  sizeClassName="h-16 w-16 sm:h-20 sm:w-20"
                  initialsClassName="text-xs sm:text-sm font-semibold text-gray-700"
                  borderClassName="border-2 border-gray-800"
                />
              )}
              <PodiumAvatar
                entry={firstPlace}
                emoji="🥇"
                sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
                initialsClassName="text-sm sm:text-base font-semibold text-gray-700"
                borderClassName="border-2 border-gray-900"
              />
              {thirdPlace && (
                <PodiumAvatar
                  entry={thirdPlace}
                  emoji="🥉"
                  sizeClassName="h-16 w-16 sm:h-20 sm:w-20"
                  initialsClassName="text-xs sm:text-sm font-semibold text-gray-700"
                  borderClassName="border-2 border-gray-700"
                />
              )}
            </div>
          </div>
        )}

        <div className="mb-6 relative">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-left">Referral Leaders</h1>

            <div
              ref={periodDropdownRef}
              className="relative w-[170px]"
            >
              <button
                type="button"
                onClick={() => setIsPeriodDropdownOpen((open) => !open)}
                className="relative w-full rounded-xl border border-gray-800 bg-transparent px-3 py-2 text-sm font-normal text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isPeriodDropdownOpen}
              >
                <span className="block w-full text-center">{activePeriodLabel}</span>
                <span
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-block transition-transform duration-200 ${
                    isPeriodDropdownOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  ▼
                </span>
              </button>
              <div
                aria-hidden={!isPeriodDropdownOpen}
                className={`absolute right-0 top-full z-20 mt-1 w-full origin-top-right overflow-hidden rounded-xl border border-gray-800 bg-white shadow-lg transition-all duration-300 ease-in-out ${
                  isPeriodDropdownOpen
                    ? "max-h-64 opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="py-1" role="listbox" aria-label="Leaderboard period">
                  {PERIODS.map((periodOption) => (
                    <button
                      key={periodOption.value}
                      type="button"
                      onClick={() => {
                        setPeriod(periodOption.value);
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-center text-sm transition-colors ${
                        period === periodOption.value
                          ? "bg-blue-50 font-normal text-gray-900"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {periodOption.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute right-0 top-[42px] z-10">
            <Badge variant="warning" size="sm">
              Under Construction
            </Badge>
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && !error && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 mb-6">
            {summaryStats.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => setSelectedSummaryStatId(stat.id)}
                className="group text-left border border-gray-800 rounded-xl p-4 transition-colors duration-150 bg-transparent hover:border-blue-600 hover:text-blue-600 active:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                <p className="text-sm text-gray-600 mb-1 transition-colors group-hover:text-blue-600">{stat.label}</p>
                <p className={`text-2xl font-bold transition-colors group-hover:text-blue-600 ${stat.valueClassName || ""}`}>{stat.value}</p>
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 mb-6">
            {summaryStats.map((stat) => (
              <div
                key={`summary-skeleton-${stat.id}`}
                className="border border-gray-800 rounded-xl p-4 bg-transparent h-[88px]"
              >
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <div className="h-6 w-16 rounded border border-gray-300 bg-transparent" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border border-red-300 bg-red-50 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && entries.length === 0 && (
          <div className="border border-gray-800 rounded-xl p-6">
            <p className="text-gray-600 text-center py-8">
              No referrals found for this period.
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <p className="mb-3 text-lg font-semibold text-gray-900">
            Top ranked by verified referrals
          </p>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && entries.length > 0 && (
          <div className="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)] gap-0 bg-gray-100 text-[11px] md:text-sm lg:text-base font-semibold tracking-wide text-gray-700 border-b border-gray-300 min-w-[642px]">
              <div id="leader-col-rank" className="sticky left-0 z-20 bg-gray-100 px-2 py-2 border-r border-gray-300">Rank</div>
              <div id="leader-col-referrer" className="sticky left-[48px] md:left-[56px] z-20 bg-gray-100 px-2 py-2 border-r border-gray-300">Referrer</div>
              <div id="leader-col-total" className="px-2 py-2 text-right">Total</div>
              <div id="leader-col-verif" className="px-2 py-2 text-right">Verif.</div>
              <div id="leader-col-eligible" className="px-2 py-2 text-right">Eligible</div>
              <div id="leader-col-active" className="px-2 py-2 text-right">Active</div>
              <div id="leader-col-earned" className="pl-2 pr-4 md:pr-5 py-2 text-right">Earned (zats)</div>
            </div>

            {/* Rows */}
            <AnimatePresence initial={false}>
              {visibleEntryChunks.map((chunk, chunkIndex) => {
                if (chunkIndex === 0) {
                  return (
                    <div key="leader-chunk-0">
                      {chunk.map((entry) => (
                        <CompactLeaderboardRow key={entry.referrerId} entry={entry} />
                      ))}
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={`leader-chunk-${chunkIndex}`}
                    className="overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 34 }}
                  >
                    {chunk.map((entry) => (
                      <CompactLeaderboardRow key={entry.referrerId} entry={entry} />
                    ))}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        {loading && (
          <div className="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)] gap-0 bg-gray-100 text-[11px] md:text-sm lg:text-base font-semibold tracking-wide text-gray-600 border-b border-gray-300 min-w-[642px] h-[36px]">
              <div className="sticky left-0 z-20 bg-gray-100 px-2 py-2 border-r border-gray-300">Rank</div>
              <div className="sticky left-[48px] md:left-[56px] z-20 bg-gray-100 px-2 py-2 border-r border-gray-300">Referrer</div>
              <div className="px-2 py-2 text-right">Total</div>
              <div className="px-2 py-2 text-right">Verif.</div>
              <div className="px-2 py-2 text-right">Eligible</div>
              <div className="px-2 py-2 text-right">Active</div>
              <div className="pl-2 pr-4 md:pr-5 py-2 text-right">Earned (zats)</div>
            </div>
            {Array.from({ length: ROWS_PER_PAGE }).map((_, rowIndex) => (
              <div
                key={`table-row-skeleton-${rowIndex}`}
                className="grid grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)] gap-0 border-b border-gray-200 min-w-[642px] h-[50px]"
              >
                <div className="sticky left-0 z-10 bg-[var(--color-background)] px-2 py-3 text-center border-r border-gray-100 text-gray-500 font-medium">
                  {rowIndex + 1}
                </div>
                <div className="sticky left-[48px] md:left-[56px] z-10 bg-[var(--color-background)] px-2 py-3 border-r border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-gray-300" />
                    <div className="min-w-0">
                      <div className="h-4 w-20 rounded border border-gray-300 bg-transparent" />
                      <div className="mt-1 h-3 w-16 rounded border border-gray-300 bg-transparent" />
                    </div>
                  </div>
                </div>
                <div className="px-2 py-3 flex justify-end"><div className="h-4 w-10 rounded border border-gray-300 bg-transparent" /></div>
                <div className="px-2 py-3 flex justify-end"><div className="h-4 w-10 rounded border border-gray-300 bg-transparent" /></div>
                <div className="px-2 py-3 flex justify-end"><div className="h-4 w-10 rounded border border-gray-300 bg-transparent" /></div>
                <div className="px-2 py-3 flex justify-end"><div className="h-4 w-10 rounded border border-gray-300 bg-transparent" /></div>
                <div className="pl-2 pr-4 md:pr-5 py-3 flex justify-end"><div className="h-4 w-16 rounded border border-gray-300 bg-transparent" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              {visibleRowsCount > ROWS_PER_PAGE && (
                <button
                  type="button"
                  onClick={() => setVisibleRowsCount((prev) => Math.max(ROWS_PER_PAGE, prev - ROWS_PER_PAGE))}
                  className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-blue-600 hover:text-blue-600"
                >
                  Show less
                </button>
              )}
              {hasMoreRows && (
                <button
                  type="button"
                  onClick={() => setVisibleRowsCount((prev) => Math.min(prev + ROWS_PER_PAGE, entries.length))}
                  className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-blue-600 hover:text-blue-600"
                >
                  Show more
                </button>
              )}
            </div>
          </div>
        )}
        {loading && (
          <div className="mt-4 flex justify-center">
            <div className="h-10 w-28 rounded-xl border border-gray-300 bg-transparent" />
          </div>
        )}

        <AnimatePresence>
          {selectedSummaryStatId && (
            <motion.div
              className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/35 px-2 pt-2 pb-0 sm:px-4 sm:pt-4 sm:pb-0"
              onClick={() => setSelectedSummaryStatId(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="w-full max-w-lg rounded-t-2xl border-x border-t border-gray-800 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="summary-stat-modal-title"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
              >
                <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200">
                  <h2 id="summary-stat-modal-title" className="text-lg font-semibold text-gray-900">
                    {SUMMARY_STAT_DETAILS[selectedSummaryStatId].title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedSummaryStatId(null)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label="Close details"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 mb-1">DESCRIPTION</p>
                    <p className="text-sm text-gray-700">
                      {SUMMARY_STAT_DETAILS[selectedSummaryStatId].description}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 mb-1">FORMULA</p>
                    <pre className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 overflow-x-auto whitespace-pre-wrap">
                      {SUMMARY_STAT_DETAILS[selectedSummaryStatId].formula}
                    </pre>
                  </div>
                </div>
                <div
                  className="pointer-events-none h-8 w-full bg-gradient-to-b from-white to-transparent"
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {constants && (
          <div className="mt-8 rounded-xl border border-gray-800 bg-transparent p-4 text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">Program assumptions</p>
            <p>
              <span className="font-semibold text-gray-900">Eligible</span> = verified within{" "}
              {constants.eligibilityWindowWeeks} weeks of signup.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Active Rewards</span> = eligible referrals still within{" "}
              {constants.rewardDurationMonths} months after verification.
            </p>
            <p>
              So <span className="font-semibold text-gray-900">Active Rewards is always part of Eligible</span>{" "}
              (never greater).
            </p>
            <p className="text-xs text-gray-600">
              Example: Eligible = 5, Active Rewards = 3 means 2 referrals were eligible before, but their{" "}
              {constants.rewardDurationMonths}-month reward window has ended.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Fee</span> = fixed fee paid when a referred user verifies
              their address:{" "}
              {formatZec(constants.verificationFeeZec)}.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Base rate</span> = starting commission:{" "}
              {formatPercent(constants.baseCommissionRate)}.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Per-link increase</span> = add{" "}
              {formatPercent(constants.commissionDeltaPerLink)} for each authenticated link.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Max rate</span> = cap commission at{" "}
              {formatPercent(constants.maxCommissionRate)}.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Link authentication</span> is free, and only users with a
              verified address can authenticate links. Users may verify their address at any time.
            </p>
            <p className="text-xs text-gray-600">
              Example: if a referrer has 4 authenticated links, rate = min(
              {formatPercent(constants.baseCommissionRate)} + 4 × {formatPercent(constants.commissionDeltaPerLink)},
              {" "}{formatPercent(constants.maxCommissionRate)}) ={" "}
              {formatPercent(
                Math.min(
                  constants.baseCommissionRate + 4 * constants.commissionDeltaPerLink,
                  constants.maxCommissionRate
                )
              )}
              .
            </p>
            <p className="text-xs text-gray-600">
              Monthly reward per active eligible referral = Fee × locked rate ={" "}
              {formatZec(constants.verificationFeeZec)} ×{" "}
              {formatPercent(
                Math.min(
                  constants.baseCommissionRate + 4 * constants.commissionDeltaPerLink,
                  constants.maxCommissionRate
                )
              )}
              {" "}({formatZec(
                constants.verificationFeeZec *
                  Math.min(
                    constants.baseCommissionRate + 4 * constants.commissionDeltaPerLink,
                    constants.maxCommissionRate
                  )
              )}).
            </p>
            <button
              type="button"
              onClick={() => setShowAssumptionDetails((open) => !open)}
              className="mt-2 text-blue-700 underline underline-offset-2 hover:text-blue-900"
            >
              {showAssumptionDetails ? "Hide column descriptions/calculations" : "Show column descriptions/calculations"}
            </button>
            {showAssumptionDetails && (
              <div className="mt-3 space-y-2 border-t border-gray-300 pt-3">
                {TABLE_COLUMN_DETAILS.map((column) => (
                  <div key={column.label} className="space-y-0.5">
                    <p className="font-semibold text-gray-900">{column.label}</p>
                    <p>{column.description}</p>
                    <p className="font-mono text-xs text-gray-800">{column.formula}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {loading && (
          <div className="mt-8 rounded-xl border border-gray-800 bg-transparent p-4">
            <div className="h-4 w-40 rounded border border-gray-800 bg-transparent" />
          </div>
        )}

        {/*

        <AnimatePresence>
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-2 text-sm text-gray-700">
                  <p>Top referrers ranked by verified referrals</p>
                  {constants && (
                    <>
                      <p>
                        Eligibility: {constants.eligibilityWindowWeeks} weeks | Duration:{" "}
                        {constants.rewardDurationMonths} months | Fee: {formatZec(constants.verificationFeeZec)}
                      </p>
                      <p>
                        Base rate: {formatPercent(constants.baseCommissionRate)} | +
                        {formatPercent(constants.commissionDeltaPerLink)}/link | Max:{" "}
                        {formatPercent(constants.maxCommissionRate)}
                      </p>
                    </>
                  )}
                </div>
                <div
                  className="pointer-events-none h-8 w-full bg-gradient-to-b from-white to-transparent"
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>
          )}
        */}

      </div>
    </div>
  );
}

function CompactLeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [showRowBottomOnCollapse, setShowRowBottomOnCollapse] = useState(false);
  const collapseOverlapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileHref = `http://localhost:3000/${encodeURIComponent(entry.referrerUsername)}`;

  useEffect(() => {
    return () => {
      if (collapseOverlapTimerRef.current) {
        clearTimeout(collapseOverlapTimerRef.current);
      }
    };
  }, []);

  const clearCollapseOverlapTimer = () => {
    if (collapseOverlapTimerRef.current) {
      clearTimeout(collapseOverlapTimerRef.current);
      collapseOverlapTimerRef.current = null;
    }
  };

  const handleRowToggle = () => {
    if (expanded) {
      setIsCollapsing(true);
      setShowRowBottomOnCollapse(false);
      setExpanded(false);
      clearCollapseOverlapTimer();
      collapseOverlapTimerRef.current = setTimeout(() => {
        setShowRowBottomOnCollapse(true);
      }, 170);
      return;
    }

    clearCollapseOverlapTimer();
    setIsCollapsing(false);
    setShowRowBottomOnCollapse(false);
    setExpanded(true);
  };
  return (
    <>
      <div className="group">
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleRowToggle();
          }
        }}
        className={`grid grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)] gap-0 border-y border-transparent border-b-gray-100 bg-transparent hover:border-t-blue-600 hover:border-l-transparent hover:border-r-transparent transition-colors text-xs sm:text-sm md:text-base min-w-[642px] cursor-pointer ${
          expanded || (isCollapsing && !showRowBottomOnCollapse)
            ? "border-b-transparent hover:border-b-transparent"
            : "hover:border-b-blue-600"
        }`}
        aria-expanded={expanded}
      >
        <div className="sticky left-0 z-10 bg-[var(--color-background)] px-2 py-3 flex items-center justify-center text-center border-r border-gray-100">
          <span className={`font-bold ${entry.rank <= 3 ? "text-base sm:text-lg" : "text-xs sm:text-sm text-gray-500"}`}>
            {entry.rank === 1 && "🥇"}
            {entry.rank === 2 && "🥈"}
            {entry.rank === 3 && "🥉"}
            {entry.rank > 3 && `${entry.rank}`}
          </span>
        </div>

        <div className="sticky left-[48px] md:left-[56px] z-10 bg-[var(--color-background)] px-2 py-3 border-r border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={profileHref}
              className="shrink-0"
              aria-label={`View ${entry.referrerUsername}`}
              onClick={(event) => event.stopPropagation()}
            >
              <ReferrerAvatar entry={entry} className="h-7 w-7 sm:h-8 sm:w-8" />
            </Link>
            <div className="min-w-0">
              <Link
                href={profileHref}
                className="block w-fit font-medium truncate text-xs sm:text-sm md:text-base"
                onClick={(event) => event.stopPropagation()}
              >
                {entry.referrerDisplayName}
              </Link>
              <Link
                href={profileHref}
                className="block w-fit text-[10px] text-gray-500 truncate"
                onClick={(event) => event.stopPropagation()}
              >
                /{entry.referrerUsername}
              </Link>
            </div>
          </div>
        </div>

      <div className="px-2 py-3 text-right font-medium">{entry.totalReferrals}</div>
      <div className="px-2 py-3 text-right font-medium text-green-600">{entry.verifiedReferrals}</div>
      <div className="px-2 py-3 text-right font-medium text-blue-600">{entry.eligibleCount}</div>
      <div className="px-2 py-3 text-right font-medium text-purple-600">{entry.activeRewardsCount}</div>
      <div className="pl-2 pr-4 md:pr-5 py-3 text-right font-medium text-green-700">{formatZats(entry.totalEarnedToDate)}</div>
      </div>

      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          clearCollapseOverlapTimer();
          setIsCollapsing(false);
          setShowRowBottomOnCollapse(false);
        }}
      >
        {expanded && (
        <motion.div
          className="min-w-[642px] overflow-hidden border-b border-gray-100 bg-gray-50 group-hover:border-b-blue-600 transition-colors"
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
        >
          <div className="grid grid-cols-3 gap-2 pl-[56px] pr-3 py-3 text-xs sm:text-sm">
            <div>
              <p className="text-gray-500">Unverified</p>
              <p className="font-medium text-gray-700">{entry.unverifiedReferrals}</p>
            </div>
            <div>
              <p className="text-gray-500">Conversion</p>
              <p className="font-medium">{entry.conversionRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-500">Potential Rate</p>
              <p className="font-medium">{formatPercent(entry.potentialCommissionRate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Ineligible</p>
              <p className="font-medium text-red-500">{entry.ineligibleCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Pending Opportunities</p>
              <p className="font-medium text-yellow-600">{entry.pendingOpportunities}</p>
            </div>
            <div>
              <p className="text-gray-500">Expired Opportunities</p>
              <p className="font-medium text-gray-500">{entry.expiredOpportunities}</p>
            </div>
            <div>
              <p className="text-gray-500">Pending Links</p>
              <p className="font-medium text-yellow-600">{entry.pendingLinksCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Active Rewards</p>
              <p className="font-medium text-purple-600">{entry.activeRewardsCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Monthly Payout (ZEC)</p>
              <p className="font-medium">{formatZec(entry.currentMonthlyPayout)}</p>
            </div>
            <div>
              <p className="text-gray-500">Revenue (ZEC)</p>
              <p className="font-medium">{formatZec(entry.totalRecurringRevenue)}</p>
            </div>
            <div>
              <p className="text-gray-500">Remaining (ZEC)</p>
              <p className="font-medium">{formatZec(entry.totalRewardsRemaining)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total (ZEC)</p>
              <p className="font-medium">{formatZec(entry.totalEarnedToDate + entry.totalRewardsRemaining)}</p>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>
    </>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Desktop Row */}
      <div className="hidden xl:grid grid-cols-[60px_160px_repeat(4,1fr)_repeat(4,1fr)_repeat(4,1fr)_repeat(3,1fr)_repeat(3,1fr)] gap-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-sm min-w-[1400px]">
        {/* Rank */}
        <div className="px-2 py-3 flex items-center border-r border-gray-100">
          <span className={`font-bold ${entry.rank <= 3 ? "text-lg" : "text-sm text-gray-500"}`}>
            {entry.rank === 1 && "🥇"}
            {entry.rank === 2 && "🥈"}
            {entry.rank === 3 && "🥉"}
            {entry.rank > 3 && `${entry.rank}`}
          </span>
        </div>

        {/* Identity */}
        <div className="px-2 py-3 border-r border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <ReferrerAvatar entry={entry} className="h-8 w-8" />
            <div className="min-w-0">
              <div className="font-medium truncate text-xs">{entry.referrerName}</div>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="px-2 py-3 text-right font-medium text-xs">{entry.totalReferrals}</div>
        <div className="px-2 py-3 text-right font-medium text-green-600 text-xs">{entry.verifiedReferrals}</div>
        <div className="px-2 py-3 text-right text-gray-500 text-xs">{entry.unverifiedReferrals}</div>
        <div className="px-2 py-3 text-right border-r border-gray-100 text-xs">{entry.conversionRate.toFixed(0)}%</div>

        {/* Eligibility */}
        <div className="px-2 py-3 text-right font-medium text-blue-600 text-xs">{entry.eligibleCount}</div>
        <div className="px-2 py-3 text-right text-red-500 text-xs">{entry.ineligibleCount}</div>
        <div className="px-2 py-3 text-right text-yellow-600 text-xs">{entry.pendingOpportunities}</div>
        <div className="px-2 py-3 text-right text-gray-400 border-r border-gray-100 text-xs">{entry.expiredOpportunities}</div>

        {/* Commission */}
        <div className="px-2 py-3 text-right font-medium text-xs">{entry.verifiedLinksCount}</div>
        <div className="px-2 py-3 text-right text-yellow-600 text-xs">{entry.pendingLinksCount}</div>
        <div className="px-2 py-3 text-right font-medium text-xs">{formatPercent(entry.currentCommissionRate)}</div>
        <div className="px-2 py-3 flex justify-center border-r border-gray-100">
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TIER_COLORS[entry.commissionTier]}`}>
            {TIER_LABELS[entry.commissionTier]}
          </span>
        </div>

        {/* Active Earnings */}
        <div className="px-2 py-3 text-right font-medium text-purple-600 text-xs">{entry.activeRewardsCount}</div>
        <div className="px-2 py-3 text-right text-xs">{formatZec(entry.currentMonthlyPayout)}</div>
        <div className="px-2 py-3 text-right border-r border-gray-100 text-xs">{formatZec(entry.totalRecurringRevenue)}</div>

        {/* Lifetime */}
        <div className="px-2 py-3 text-right font-medium text-green-700 text-xs">{formatZats(entry.totalEarnedToDate)}</div>
        <div className="px-2 py-3 text-right text-gray-600 text-xs">{formatZec(entry.totalRewardsRemaining)}</div>
        <div className="px-2 py-3 text-right font-bold text-xs">{formatZec(entry.totalEarnedToDate + entry.totalRewardsRemaining)}</div>
      </div>

      {/* Mobile/Tablet Row - Table format with expandable details */}
      <div className="xl:hidden border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full hover:bg-gray-50 transition-colors"
        >
          {/* Table Row */}
          <div className="grid grid-cols-[40px_1fr_50px_50px_60px_70px_28px] sm:grid-cols-[50px_1fr_60px_60px_70px_80px_32px] gap-1 sm:gap-2 px-2 sm:px-3 py-3 items-center text-xs sm:text-sm">
            {/* Rank */}
            <div className="text-left">
              <span className={`font-bold ${entry.rank <= 3 ? "text-base" : "text-xs text-gray-500"}`}>
                {entry.rank === 1 && "🥇"}
                {entry.rank === 2 && "🥈"}
                {entry.rank === 3 && "🥉"}
                {entry.rank > 3 && `${entry.rank}`}
              </span>
            </div>

            {/* Name + Tier */}
            <div className="text-left min-w-0 flex items-center gap-2">
              <ReferrerAvatar entry={entry} className="h-7 w-7 sm:h-8 sm:w-8" />
              <div className="min-w-0">
                <div className="font-medium truncate text-xs sm:text-sm">{entry.referrerName}</div>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${TIER_COLORS[entry.commissionTier]}`}>
                  {TIER_LABELS[entry.commissionTier]}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="text-right font-medium">{entry.totalReferrals}</div>

            {/* Verified */}
            <div className="text-right font-medium text-green-600">{entry.verifiedReferrals}</div>

            {/* Rate */}
            <div className="text-right font-medium">{formatPercent(entry.currentCommissionRate)}</div>

            {/* Earned */}
            <div className="text-right font-medium text-green-700">{formatZats(entry.totalEarnedToDate)}</div>

            {/* Expand Icon */}
            <div className="flex justify-center">
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Performance */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">REFERRAL PERFORMANCE</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Total</div>
                  <div className="font-medium">{entry.totalReferrals}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Verified</div>
                  <div className="font-medium text-green-600">{entry.verifiedReferrals}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Unverified</div>
                  <div className="text-gray-500">{entry.unverifiedReferrals}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Conv.</div>
                  <div className="font-medium">{entry.conversionRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">REWARD ELIGIBILITY</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Eligible</div>
                  <div className="font-medium text-blue-600">{entry.eligibleCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Ineligible</div>
                  <div className="text-red-500">{entry.ineligibleCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Pending</div>
                  <div className="text-yellow-600">{entry.pendingOpportunities}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Expired</div>
                  <div className="text-gray-400">{entry.expiredOpportunities}</div>
                </div>
              </div>
            </div>

            {/* Commission */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">COMMISSION</h4>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs">Authenticated Links</div>
                      <div className="font-medium">{entry.verifiedLinksCount}</div>
                    </div>
                <div>
                  <div className="text-gray-500 text-xs">Pending Links</div>
                  <div className="text-yellow-600">{entry.pendingLinksCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Current Rate</div>
                  <div className="font-medium">{formatPercent(entry.currentCommissionRate)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Potential</div>
                  <div className="text-gray-600">{formatPercent(entry.potentialCommissionRate)}</div>
                </div>
              </div>
            </div>

            {/* Active Earnings */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">ACTIVE EARNINGS</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Active</div>
                  <div className="font-medium text-purple-600">{entry.activeRewardsCount}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Monthly</div>
                  <div className="font-medium">{formatZec(entry.currentMonthlyPayout)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Revenue (ZEC)</div>
                  <div className="font-medium">{formatZec(entry.totalRecurringRevenue)}</div>
                </div>
              </div>
            </div>

            {/* Lifetime Earnings */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">LIFETIME EARNINGS</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Earned (zats)</div>
                  <div className="font-medium text-green-700">{formatZats(entry.totalEarnedToDate)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Remaining (ZEC)</div>
                  <div className="text-gray-600">{formatZec(entry.totalRewardsRemaining)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Total (ZEC)</div>
                  <div className="font-bold">{formatZec(entry.totalEarnedToDate + entry.totalRewardsRemaining)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
