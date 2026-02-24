import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Badge from "@/ui/common/feedback/Badge";
import {
  getReferrerStatsAction,
  type ReferralStatus,
} from "@/lib/leaderboard/getReferrerStatsAction";
import { ReferrerAvatar, LeaderboardTable } from "../LeaderboardClientIslands";

const PROFILE_BASE_URL = "https://zcash.me";

// ── Metadata ─────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const { ok, referrer } = await getReferrerStatsAction(username);

  if (!ok || !referrer) {
    return { title: "Referrer Not Found" };
  }

  return {
    title: `${referrer.displayName}'s Referrals — ZcashMe`,
    description: `Referral stats for ${referrer.displayName} on ZcashMe`,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<ReferralStatus, { label: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  eligible: { label: "Eligible", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  expired: { label: "Expired", variant: "neutral" },
  ineligible: { label: "Ineligible", variant: "error" },
};

// ── Page ─────────────────────────────────────────────────────

export default async function ReferrerStatsPage({ params }: PageProps) {
  const { username } = await params;
  const response = await getReferrerStatsAction(username);

  if (!response.ok || !response.referrer) {
    notFound();
  }

  const { referrer, referrals, summary } = response;
  const profileHref = `${PROFILE_BASE_URL}/${encodeURIComponent(referrer.username)}`;

  const summaryStats: Array<{ id: string; label: string; value: string | number; className?: string }> = [
    { id: "total", label: "Total Referred", value: summary.total },
    { id: "verified", label: "Verified", value: summary.verified, className: "text-green-600" },
    { id: "unverified", label: "Unverified", value: summary.unverified },
    { id: "conversion", label: "Conversion", value: `${summary.conversionRate.toFixed(1)}%` },
  ];

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/leader-app"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--color-brand-blue)] mb-6"
        >
          &larr; Leaderboard
        </Link>

        {/* Referrer header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={profileHref} className="shrink-0">
            <ReferrerAvatar
              imageUrl={referrer.profileImageUrl}
              initials={getInitials(referrer.displayName)}
              displayName={referrer.displayName}
              className="h-14 w-14"
            />
          </Link>
          <div className="min-w-0">
            <Link href={profileHref} className="block w-fit text-xl font-bold truncate">
              {referrer.displayName}
            </Link>
            <Link href={profileHref} className="block w-fit text-sm text-gray-500 truncate">
              /{referrer.username}
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {summaryStats.map((stat) => (
            <div
              key={stat.id}
              className="border border-gray-800 rounded-xl p-4 bg-transparent"
            >
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.className || ""}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Referrals table */}
        {referrals.length === 0 ? (
          <div className="border border-gray-800 rounded-xl p-6">
            <p className="text-gray-600 text-center py-8">No referrals yet.</p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-[160px_100px_80px_100px_90px] md:grid-cols-[minmax(200px,2fr)_110px_80px_110px_100px] gap-0 bg-gray-100 text-[11px] md:text-sm font-semibold tracking-wide text-gray-700 border-b border-gray-300 min-w-[530px]">
              <div className="sticky left-0 z-20 bg-gray-100 px-3 py-2 border-r border-gray-300">User</div>
              <div className="px-3 py-2 text-right">Joined</div>
              <div className="px-3 py-2 text-center">Verified</div>
              <div className="px-3 py-2 text-right">Last Verified</div>
              <div className="px-3 py-2 text-center">Status</div>
            </div>

            {/* Rows */}
            <LeaderboardTable totalRows={referrals.length}>
              {referrals.map((r) => {
                const userHref = `${PROFILE_BASE_URL}/${encodeURIComponent(r.username)}`;
                const statusCfg = STATUS_CONFIG[r.status];

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[160px_100px_80px_100px_90px] md:grid-cols-[minmax(200px,2fr)_110px_80px_110px_100px] gap-0 border-b border-gray-100 text-xs sm:text-sm min-w-[530px]"
                  >
                    {/* User — sticky */}
                    <div className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-3 flex items-center gap-2 min-w-0 border-r border-gray-100">
                      <Link href={userHref} className="shrink-0">
                        <ReferrerAvatar
                          imageUrl={r.profileImageUrl}
                          initials={getInitials(r.displayName)}
                          displayName={r.displayName}
                          className="h-7 w-7"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link href={userHref} className="block w-fit font-medium truncate text-xs sm:text-sm">
                          {r.displayName}
                        </Link>
                        <Link href={userHref} className="block w-fit text-[10px] text-gray-500 truncate">
                          /{r.username}
                        </Link>
                      </div>
                    </div>

                    {/* Joined */}
                    <div className="px-3 py-3 text-right text-gray-600 self-center">
                      {formatDate(r.createdAt)}
                    </div>

                    {/* Verified */}
                    <div className="px-3 py-3 text-center self-center">
                      {r.addressVerified ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </div>

                    {/* Last Verified */}
                    <div className="px-3 py-3 text-right text-gray-600 self-center">
                      {r.lastVerifiedAt ? formatDate(r.lastVerifiedAt) : "—"}
                    </div>

                    {/* Status */}
                    <div className="px-3 py-3 text-center self-center">
                      <Badge variant={statusCfg.variant} size="xs">
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </LeaderboardTable>
          </div>
        )}
      </div>
    </div>
  );
}
