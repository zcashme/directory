import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  getLeaderboardAction,
  type Period,
  type LeaderboardEntry,
} from "@/lib/leaderboard/getLeaderboardAction";
import {
  PodiumAvatar,
  LeaderAvatar,
  LeaderboardTable,
  AssumptionDetails,
  ClickStopLink,
} from "./LeaderboardClient";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";

const PROFILE_BASE_URL = "https://zcash.me";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "alltime", label: "All Time" },
];

const VALID_PERIODS = new Set<string>(PERIODS.map((p) => p.value));

function isValidPeriod(value: string | undefined): value is Period {
  return typeof value === "string" && VALID_PERIODS.has(value);
}

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

// ── Formatting helpers ────────────────────────────────────────

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

function formatZec(value: number): ReactElement {
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

// ── Row content (server-rendered, passed to client ExpandableRow) ──

function RowSummary({ entry }: { entry: LeaderboardEntry }) {
  const safeUsername = sanitizeUsernameInput(entry.referrerUsername);
  const profileHref = `${PROFILE_BASE_URL}/${safeUsername}`;
  const statsHref = `/${safeUsername}`;
  return (
    <>
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
          <ClickStopLink
            href={profileHref}
            className="shrink-0"
            ariaLabel={`View ${entry.referrerUsername}`}
          >
            <LeaderAvatar
              imageUrl={entry.referrerProfileImageUrl}
              name={entry.referrerDisplayName}
              size={28}
            />
          </ClickStopLink>
          <div className="min-w-0">
            <ClickStopLink
              href={statsHref}
              className="block w-fit font-medium truncate text-xs sm:text-sm md:text-base hover:text-[var(--color-brand-blue)]"
            >
              {entry.referrerDisplayName}
            </ClickStopLink>
            <ClickStopLink
              href={profileHref}
              className="block w-fit text-[10px] text-gray-500 truncate"
            >
              /{entry.referrerUsername}
            </ClickStopLink>
          </div>
        </div>
      </div>

      <div className="px-2 py-3 text-right font-medium">{entry.totalReferrals}</div>
      <div className="px-2 py-3 text-right font-medium text-green-600">{entry.verifiedReferrals}</div>
      <div className="px-2 py-3 text-right font-medium text-[var(--color-brand-blue)]">{entry.eligibleCount}</div>
      <div className="px-2 py-3 text-right font-medium text-purple-600">{entry.activeRewardsCount}</div>
      <div className="pl-2 pr-4 md:pr-5 py-3 text-right font-medium text-green-700">{formatZats(entry.totalEarnedToDate)}</div>
    </>
  );
}


// ── Page ──────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period = isValidPeriod(params.period) ? params.period : "alltime";
  const response = await getLeaderboardAction(period);

  const entries = response.ok ? response.data : [];
  const error = response.ok ? null : (response.error || "Failed to load leaderboard");
  const constants = response.constants;

  const totalReferrals = entries.reduce((sum, e) => sum + e.totalReferrals, 0);
  const totalVerified = entries.reduce((sum, e) => sum + e.verifiedReferrals, 0);
  const totalEarned = entries.reduce((sum, e) => sum + e.totalEarnedToDate, 0);

  const summaryStats: Array<{
    id: string;
    label: string;
    value: ReactNode;
    valueClassName?: string;
  }> = [
    { id: "totalReferrals", label: "Total Referrals", value: totalReferrals },
    { id: "verified", label: "Verified Referrals", value: totalVerified, valueClassName: "text-green-600" },
    { id: "totalEarned", label: "Total Earned (ZEC)", value: formatZec(totalEarned), valueClassName: "text-green-700" },
  ];

  const firstPlace = entries[0];
  const secondPlace = entries[1];
  const thirdPlace = entries[2];

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Podium */}
        {firstPlace && (
          <div className="relative mb-6 h-24 sm:h-28 w-full" style={{ transform: "translateY(10px)" }}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-black" />
            <div className="relative z-10 flex h-full items-center justify-center gap-2 sm:gap-3">
              {secondPlace && (
                <PodiumAvatar
                  profileHref={`${PROFILE_BASE_URL}/${sanitizeUsernameInput(secondPlace.referrerUsername)}`}
                  imageUrl={secondPlace.referrerProfileImageUrl}
                  name={secondPlace.referrerDisplayName}
                  emoji="🥈"
                  size={60}
                />
              )}
              <PodiumAvatar
                profileHref={`${PROFILE_BASE_URL}/${sanitizeUsernameInput(firstPlace.referrerUsername)}`}
                imageUrl={firstPlace.referrerProfileImageUrl}
                name={firstPlace.referrerDisplayName}
                emoji="🥇"
                size={74}
              />
              {thirdPlace && (
                <PodiumAvatar
                  profileHref={`${PROFILE_BASE_URL}/${sanitizeUsernameInput(thirdPlace.referrerUsername)}`}
                  imageUrl={thirdPlace.referrerProfileImageUrl}
                  name={thirdPlace.referrerDisplayName}
                  emoji="🥉"
                  size={60}
                />
              )}
            </div>
          </div>
        )}

        {/* Header + Period Links */}
        <div className="mb-6 relative">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-left">Referral Leaders</h1>

            <div className="flex items-center gap-1">
              {PERIODS.map((p) => (
                <Link
                  key={p.value}
                  href={`?period=${p.value}`}
                  className={`rounded-xl border px-3 py-2 text-sm font-normal transition-colors ${
                    period === p.value
                      ? "border-[var(--color-brand-blue)] text-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10"
                      : "border-gray-800 bg-transparent text-gray-900 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
            {summaryStats.map((stat) => (
              <div
                key={stat.id}
                className="border border-gray-800 rounded-xl p-4 bg-transparent"
              >
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.valueClassName || ""}`}>{stat.value}</p>
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
        {!error && entries.length === 0 && (
          <div className="border border-gray-800 rounded-xl p-6">
            <p className="text-gray-600 text-center py-8">
              No referrals found for this period.
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <p className="mb-3 text-lg font-semibold text-gray-900">
            Top ranked by verified referrals
          </p>
        )}

        {/* Leaderboard Table */}
        {entries.length > 0 && (
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

            <LeaderboardTable totalRows={entries.length}>
              {entries.map((entry) => (
                <div
                  key={entry.referrerId}
                  className="grid grid-cols-[48px_170px_76px_76px_76px_76px_120px] md:grid-cols-[56px_minmax(220px,1.9fr)_repeat(4,minmax(84px,1fr))_minmax(140px,1.5fr)] gap-0 border-b border-gray-100 text-xs sm:text-sm md:text-base min-w-[642px]"
                >
                  <RowSummary entry={entry} />
                </div>
              ))}
            </LeaderboardTable>
          </div>
        )}

        {/* Program Assumptions */}
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
              <span className="font-semibold text-gray-900">Profile completeness</span> = add{" "}
              {formatPercent(constants.profileCompletenessBonus)} for each: profile picture, bio, location.
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
              Example: a referrer with a profile picture, bio, location, and 2 authenticated links →
              rate = min(
              {formatPercent(constants.baseCommissionRate)} + 3 × {formatPercent(constants.profileCompletenessBonus)} + 2 × {formatPercent(constants.commissionDeltaPerLink)},
              {" "}{formatPercent(constants.maxCommissionRate)}) ={" "}
              {formatPercent(
                Math.min(
                  constants.baseCommissionRate + 3 * constants.profileCompletenessBonus + 2 * constants.commissionDeltaPerLink,
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
                  constants.baseCommissionRate + 3 * constants.profileCompletenessBonus + 2 * constants.commissionDeltaPerLink,
                  constants.maxCommissionRate
                )
              )}
              {" "}({formatZec(
                constants.verificationFeeZec *
                  Math.min(
                    constants.baseCommissionRate + 3 * constants.profileCompletenessBonus + 2 * constants.commissionDeltaPerLink,
                    constants.maxCommissionRate
                  )
              )}).
            </p>
            <AssumptionDetails>
              {TABLE_COLUMN_DETAILS.map((column) => (
                <div key={column.label} className="space-y-0.5">
                  <p className="font-semibold text-gray-900">{column.label}</p>
                  <p>{column.description}</p>
                  <p className="font-mono text-xs text-gray-800">{column.formula}</p>
                </div>
              ))}
            </AssumptionDetails>
          </div>
        )}
      </div>
    </div>
  );
}
