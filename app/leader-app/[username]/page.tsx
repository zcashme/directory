import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Badge from "@/ui/common/feedback/Badge";
import { getReferrerStatsAction } from "@/lib/leaderboard/getReferrerStatsAction";
import type { ReferralStatus } from "@/lib/leaderboard/rewardProgram";
import { LeaderAvatar, LeaderboardTable } from "../LeaderboardClient";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatZats(zats: number): string {
  if (zats === 0) return "0";
  if (zats >= 1e8) return `${(zats / 1e8).toFixed(4)} ZEC`;
  return zats.toLocaleString();
}

const STATUS_CONFIG: Record<ReferralStatus, { label: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  active: { label: "Active", variant: "success" },
  eligible: { label: "Eligible", variant: "warning" },
  expired: { label: "Expired", variant: "neutral" },
  ineligible: { label: "N/A", variant: "error" },
};

// ── Page ─────────────────────────────────────────────────────

export default async function ReferrerStatsPage({ params }: PageProps) {
  const { username } = await params;
  const response = await getReferrerStatsAction(username);

  if (!response.ok || !response.referrer) {
    notFound();
  }

  const { referrer, referrals, summary } = response;
  const profileHref = `/${encodeURIComponent(referrer.username)}`;

  const summaryStats: Array<{ id: string; label: string; value: string | number; className?: string }> = [
    { id: "total", label: "Referred", value: summary.total },
    { id: "verified", label: "Verified", value: summary.verified, className: "text-green-600" },
    { id: "eligible", label: "Eligible", value: summary.eligible },
    { id: "active", label: "Active", value: summary.active, className: "text-blue-600" },
    { id: "zats", label: "Zats Earned", value: formatZats(summary.totalEarnedZats), className: "text-amber-600" },
  ];

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-12"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--color-brand-blue)] mb-6"
        >
          &larr; Leaderboard
        </Link>

        {/* Referrer header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={profileHref} className="shrink-0">
            <LeaderAvatar
              imageUrl={referrer.profileImageUrl}
              name={referrer.displayName}
              size={50}
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
            <div className="grid grid-cols-[160px_100px_100px_80px_100px_80px] md:grid-cols-[minmax(180px,2fr)_110px_110px_90px_110px_100px] gap-0 bg-gray-100 text-[11px] md:text-sm font-semibold tracking-wide text-gray-700 border-b border-gray-300 min-w-[620px]">
              <div className="sticky left-0 z-20 bg-gray-100 px-3 py-2 border-r border-gray-300">User</div>
              <div className="px-3 py-2 text-right">Joined</div>
              <div className="px-3 py-2 text-right">First Verified</div>
              <div className="px-3 py-2 text-center">Status</div>
              <div className="px-3 py-2 text-right">Auth Links</div>
              <div className="px-3 py-2 text-right">Zats</div>
            </div>

            {/* Rows */}
            <LeaderboardTable totalRows={referrals.length}>
              {referrals.map((r) => {
                const userHref = `/${encodeURIComponent(r.username)}`;
                const statusCfg = STATUS_CONFIG[r.status];

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[160px_100px_100px_80px_100px_80px] md:grid-cols-[minmax(180px,2fr)_110px_110px_90px_110px_100px] gap-0 border-b border-gray-100 text-xs sm:text-sm min-w-[620px]"
                  >
                    {/* User — sticky */}
                    <div className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-3 flex items-center gap-2 min-w-0 border-r border-gray-100">
                      <Link href={userHref} className="shrink-0">
                        <LeaderAvatar
                          imageUrl={r.profileImageUrl}
                          name={r.displayName}
                          size={24}
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

                    {/* First Verified */}
                    <div className="px-3 py-3 text-right text-gray-600 self-center">
                      {r.lastVerifiedAt ? formatDate(r.lastVerifiedAt) : "—"}
                    </div>

                    {/* Status */}
                    <div className="px-3 py-3 text-center self-center">
                      <Badge variant={statusCfg.variant} size="xs">
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Auth Links */}
                    <div className="px-3 py-3 text-right text-gray-600 self-center">
                      {r.verifiedLinksCount}
                    </div>

                    {/* Zats */}
                    <div className="px-3 py-3 text-right self-center font-medium">
                      {r.earnedZats > 0 ? formatZats(r.earnedZats) : "—"}
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
