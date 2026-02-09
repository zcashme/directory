"use client";

import ProfileHeader from "@/ui/profile/ProfileHeader";

export default function StatsPage() {
  return (
    <>
      <ProfileHeader />
      <div className="min-h-screen p-4 md:p-8 pt-12" style={{ backgroundColor: "var(--color-background)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Zcash Network Statistics</h1>
            <p className="text-gray-600">Real-time metrics and analytics for the Zcash network</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Placeholder stat cards */}
            <div className="border border-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-600 mb-2">Total Profiles</p>
              <p className="text-3xl font-bold">—</p>
              <p className="text-xs text-gray-500 mt-1">Coming soon</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-600 mb-2">Verified Profiles</p>
              <p className="text-3xl font-bold">—</p>
              <p className="text-xs text-gray-500 mt-1">Coming soon</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-600 mb-2">Total Swaps</p>
              <p className="text-3xl font-bold">—</p>
              <p className="text-xs text-gray-500 mt-1">Coming soon</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-600 mb-2">Swap Volume (24h)</p>
              <p className="text-3xl font-bold">—</p>
              <p className="text-xs text-gray-500 mt-1">Coming soon</p>
            </div>
          </div>

          <div className="border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">About Statistics</h2>
            <p className="text-gray-600 mb-4">
              This page will display comprehensive statistics about the Zcash network, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Profile registration and verification metrics</li>
              <li>Cross-chain swap activity and volume</li>
              <li>Network growth and adoption trends</li>
              <li>Geographic distribution of users</li>
              <li>Popular payment routes and tokens</li>
            </ul>
            <p className="text-sm text-gray-500 mt-4 italic">
              Statistics tracking and analytics features are currently in development.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
