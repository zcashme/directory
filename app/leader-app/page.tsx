"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("alltime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await getLeaderboardAction(period);
    if (response.ok) {
      setEntries(response.data);
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Referral Leaderboard</h1>
          <p className="text-gray-600">
            Top referrers ranked by verified referrals
          </p>
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
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[60px_1fr_100px_100px_100px_100px] gap-4 px-4 py-3 bg-gray-50 text-xs font-semibold tracking-wide border-b border-gray-200">
              <div>Rank</div>
              <div>Referrer</div>
              <div className="text-right">Total</div>
              <div className="text-right">Verified</div>
              <div className="text-right">Unverified</div>
              <div className="text-right">Conv. Rate</div>
            </div>

            {/* Rows */}
            {entries.map((entry) => (
              <div
                key={entry.referrerId}
                className="grid grid-cols-2 md:grid-cols-[60px_1fr_100px_100px_100px_100px] gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center">
                  <span
                    className={`font-bold ${
                      entry.rank <= 3 ? "text-lg" : "text-sm text-gray-500"
                    }`}
                  >
                    {entry.rank === 1 && "🥇"}
                    {entry.rank === 2 && "🥈"}
                    {entry.rank === 3 && "🥉"}
                    {entry.rank > 3 && `#${entry.rank}`}
                  </span>
                </div>

                {/* Referrer Info */}
                <div className="flex flex-col md:flex-row md:items-center gap-1">
                  <span className="font-medium">{entry.referrerName}</span>
                  <span className="text-xs text-gray-400 md:ml-2">
                    ID: {entry.referrerId}
                  </span>
                </div>

                {/* Stats - Mobile */}
                <div className="col-span-2 md:hidden grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Total</div>
                    <div className="font-medium">{entry.totalReferrals}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Verified</div>
                    <div className="font-medium text-green-600">
                      {entry.verifiedReferrals}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Unverified</div>
                    <div className="font-medium text-gray-500">
                      {entry.unverifiedReferrals}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Rate</div>
                    <div className="font-medium">
                      {entry.conversionRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Stats - Desktop */}
                <div className="hidden md:block text-right font-medium">
                  {entry.totalReferrals}
                </div>
                <div className="hidden md:block text-right font-medium text-green-600">
                  {entry.verifiedReferrals}
                </div>
                <div className="hidden md:block text-right font-medium text-gray-500">
                  {entry.unverifiedReferrals}
                </div>
                <div className="hidden md:block text-right font-medium">
                  {entry.conversionRate.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && !error && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
              <p className="text-sm text-gray-600 mb-1">Verified Referrals</p>
              <p className="text-2xl font-bold text-green-600">
                {entries.reduce((sum, e) => sum + e.verifiedReferrals, 0)}
              </p>
            </div>
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Avg Conversion</p>
              <p className="text-2xl font-bold">
                {entries.length > 0
                  ? (
                      entries.reduce((sum, e) => sum + e.conversionRate, 0) /
                      entries.length
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
