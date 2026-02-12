"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLeaderboardAction,
  type Period,
  type LeaderboardEntry,
  type CommissionTier,
} from "@/lib/leaderboard/getLeaderboardAction";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "alltime", label: "All Time" },
];

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const TIER_COLORS: Record<CommissionTier, string> = {
  base: "bg-gray-100 text-gray-700",
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
};

const TIER_LABELS: Record<CommissionTier, string> = {
  base: "Base",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("alltime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [constants, setConstants] = useState<{
    eligibilityWindowWeeks: number;
    rewardDurationMonths: number;
    baseCommissionRate: number;
    commissionDeltaPerLink: number;
    maxCommissionRate: number;
    verificationFee: number;
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

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Referral Leaderboard</h1>
          <p className="text-gray-600">
            Top referrers ranked by verified referrals
          </p>
          {constants && (
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              <p>
                Eligibility: {constants.eligibilityWindowWeeks} weeks |
                Duration: {constants.rewardDurationMonths} months |
                Fee: {formatCurrency(constants.verificationFee)}
              </p>
              <p>
                Base rate: {formatPercent(constants.baseCommissionRate)} |
                +{formatPercent(constants.commissionDeltaPerLink)}/link |
                Max: {formatPercent(constants.maxCommissionRate)}
              </p>
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="border border-red-300 bg-red-50 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
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

        {/* Leaderboard Table */}
        {!loading && !error && entries.length > 0 && (
          <div className="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            {/* Header */}
            <div className="hidden xl:block min-w-[1400px]">
              {/* Column Group Headers */}
              <div className="grid grid-cols-[60px_160px_1fr_1fr_1fr_1fr_1fr] gap-0 bg-gray-100 text-xs font-bold border-b border-gray-300">
                <div className="px-2 py-2 border-r border-gray-300"></div>
                <div className="px-2 py-2 border-r border-gray-300">Identity</div>
                <div className="px-2 py-2 border-r border-gray-300 text-center">Performance</div>
                <div className="px-2 py-2 border-r border-gray-300 text-center">Eligibility</div>
                <div className="px-2 py-2 border-r border-gray-300 text-center">Commission</div>
                <div className="px-2 py-2 border-r border-gray-300 text-center">Active Earnings</div>
                <div className="px-2 py-2 text-center">Lifetime Earnings</div>
              </div>
              {/* Column Sub-Headers */}
              <div className="grid grid-cols-[60px_160px_repeat(4,1fr)_repeat(4,1fr)_repeat(4,1fr)_repeat(3,1fr)_repeat(3,1fr)] gap-0 bg-gray-50 text-[10px] font-semibold tracking-wide border-b border-gray-200 min-w-[1400px]">
                <div className="px-2 py-2 border-r border-gray-200">Rank</div>
                <div className="px-2 py-2 border-r border-gray-200">Referrer</div>
                {/* Performance */}
                <div className="px-2 py-2 text-right">Total</div>
                <div className="px-2 py-2 text-right">Verified</div>
                <div className="px-2 py-2 text-right">Unverif.</div>
                <div className="px-2 py-2 text-right border-r border-gray-200">Conv%</div>
                {/* Eligibility */}
                <div className="px-2 py-2 text-right">Eligible</div>
                <div className="px-2 py-2 text-right">Inelig.</div>
                <div className="px-2 py-2 text-right">Pending</div>
                <div className="px-2 py-2 text-right border-r border-gray-200">Expired</div>
                {/* Commission */}
                <div className="px-2 py-2 text-right">Links</div>
                <div className="px-2 py-2 text-right">Pending</div>
                <div className="px-2 py-2 text-right">Rate</div>
                <div className="px-2 py-2 text-center border-r border-gray-200">Tier</div>
                {/* Active Earnings */}
                <div className="px-2 py-2 text-right">Active</div>
                <div className="px-2 py-2 text-right">Monthly</div>
                <div className="px-2 py-2 text-right border-r border-gray-200">Revenue</div>
                {/* Lifetime */}
                <div className="px-2 py-2 text-right">Earned</div>
                <div className="px-2 py-2 text-right">Remaining</div>
                <div className="px-2 py-2 text-right">Total</div>
              </div>
            </div>

            {/* Rows */}
            {entries.map((entry) => (
              <LeaderboardRow key={entry.referrerId} entry={entry} />
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && !error && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Referrers</p>
              <p className="text-2xl font-bold">{entries.length}</p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold">
                {entries.reduce((sum, e) => sum + e.totalReferrals, 0)}
              </p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Verified</p>
              <p className="text-2xl font-bold text-green-600">
                {entries.reduce((sum, e) => sum + e.verifiedReferrals, 0)}
              </p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Eligible</p>
              <p className="text-2xl font-bold text-blue-600">
                {entries.reduce((sum, e) => sum + e.eligibleCount, 0)}
              </p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Active Rewards</p>
              <p className="text-2xl font-bold text-purple-600">
                {entries.reduce((sum, e) => sum + e.activeRewardsCount, 0)}
              </p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(entries.reduce((sum, e) => sum + e.totalEarnedToDate, 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
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
            {entry.rank > 3 && `#${entry.rank}`}
          </span>
        </div>

        {/* Identity */}
        <div className="px-2 py-3 border-r border-gray-100">
          <div className="font-medium truncate text-xs">{entry.referrerName}</div>
          <div className="text-[10px] text-gray-400">ID: {entry.referrerId}</div>
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
        <div className="px-2 py-3 text-right text-xs">{formatCurrency(entry.currentMonthlyPayout)}</div>
        <div className="px-2 py-3 text-right border-r border-gray-100 text-xs">{formatCurrency(entry.totalRecurringRevenue)}</div>

        {/* Lifetime */}
        <div className="px-2 py-3 text-right font-medium text-green-700 text-xs">{formatCurrency(entry.totalEarnedToDate)}</div>
        <div className="px-2 py-3 text-right text-gray-600 text-xs">{formatCurrency(entry.totalRewardsRemaining)}</div>
        <div className="px-2 py-3 text-right font-bold text-xs">{formatCurrency(entry.totalEarnedToDate + entry.totalRewardsRemaining)}</div>
      </div>

      {/* Mobile/Tablet Row */}
      <div className="xl:hidden border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <span className={`font-bold ${entry.rank <= 3 ? "text-lg" : "text-sm text-gray-500"}`}>
              {entry.rank === 1 && "🥇"}
              {entry.rank === 2 && "🥈"}
              {entry.rank === 3 && "🥉"}
              {entry.rank > 3 && `#${entry.rank}`}
            </span>
            <div className="text-left">
              <div className="font-medium flex items-center gap-2">
                {entry.referrerName}
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TIER_COLORS[entry.commissionTier]}`}>
                  {TIER_LABELS[entry.commissionTier]}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {entry.verifiedReferrals} verified · {formatPercent(entry.currentCommissionRate)} rate · {formatCurrency(entry.totalEarnedToDate)} earned
              </div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
                  <div className="text-gray-500 text-xs">Verified Links</div>
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
                  <div className="font-medium">{formatCurrency(entry.currentMonthlyPayout)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Revenue</div>
                  <div className="font-medium">{formatCurrency(entry.totalRecurringRevenue)}</div>
                </div>
              </div>
            </div>

            {/* Lifetime Earnings */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">LIFETIME EARNINGS</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Earned</div>
                  <div className="font-medium text-green-700">{formatCurrency(entry.totalEarnedToDate)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Remaining</div>
                  <div className="text-gray-600">{formatCurrency(entry.totalRewardsRemaining)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Total</div>
                  <div className="font-bold">{formatCurrency(entry.totalEarnedToDate + entry.totalRewardsRemaining)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
