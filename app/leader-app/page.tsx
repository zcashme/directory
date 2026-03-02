import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  getLeaderboardAction,
  type Period,
} from "@/lib/leaderboard/getLeaderboardAction";
import {
  PodiumAvatar,
  SortableLeaderboard,
  FAQAccordion,
} from "./LeaderboardClient";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";

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

const FAQ_ITEMS: Array<{ id: string; question: string; answer: string | ReactElement }> = [
  {
    id: "faq-verification",
    question: "Do I need to be verified to appear on the leaderboard?",
    answer:
      "Yes. Users must verify their address to appear on the leaderboard. Only verified referrers and their verified referrals count towards ranking.",
  },
  {
    id: "faq-eligible",
    question: "What makes a referral 'Eligible'?",
    answer: (
      <>
        A referral is eligible if the referred user verifies their address within{" "}
        <span className="font-semibold">4 weeks of signing up</span>. After that window closes, new
        verifications don't count as eligible.
      </>
    ),
  },
  {
    id: "faq-active",
    question: "What are 'Active Rewards'?",
    answer: (
      <>
        Active rewards are eligible referrals still within the{" "}
        <span className="font-semibold">12-month reward payout window</span> after verification. Once
        12 months pass, the referral is no longer active.
      </>
    ),
  },
  {
    id: "faq-earned",
    question: "How are rewards calculated?",
    answer: (
      <>
        Rewards = base rate (15%) + profile bonuses (5% each for profile image, bio, and location, up to
        15%) + link bonuses (10% per authenticated link), capped at 50%. Multiplied by the minimum
        verification fee, locked at verification time, paid monthly for 12 months.
      </>
    ),
  },
];

function formatZats(value: number): string {
  return Math.round(value * 100000000).toLocaleString("en-US");
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period = isValidPeriod(params.period) ? params.period : "alltime";
  const response = await getLeaderboardAction(period);

  const entries = response.ok ? response.data : [];
  const error = response.ok ? null : response.error ?? "Failed to load leaderboard";

  const totalReferrals = entries.reduce((sum, e) => sum + e.totalReferrals, 0);
  const totalVerified = entries.reduce((sum, e) => sum + e.verifiedReferrals, 0);
  const totalEarned = entries.reduce((sum, e) => sum + e.totalEarnedToDate, 0);

  const summaryStats: Array<{
    id: string;
    label: string;
    value: ReactNode;
    valueClassName?: string;
  }> = [
    { id: "totalReferrals", label: "Referrals", value: totalReferrals },
    {
      id: "verified",
      label: "Verified Referrals",
      value: totalVerified,
      valueClassName: "text-green-600",
    },
    {
      id: "totalEarned",
      label: "Rewards (zats)",
      value: formatZats(totalEarned),
      valueClassName: "text-green-700",
    },
  ];

  const firstPlace = entries[0];
  const secondPlace = entries[1];
  const thirdPlace = entries[2];

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-6 md:pt-8"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        {firstPlace && (
          <div className="relative mb-8 h-24 sm:h-28 w-full">
            <div className="relative z-10 mx-auto flex h-full w-fit items-end justify-center gap-3 sm:gap-4">
              {secondPlace && (
                <PodiumAvatar
                  profileHref={`/${sanitizeUsernameInput(secondPlace.referrerUsername)}`}
                  imageUrl={secondPlace.referrerProfileImageUrl}
                  name={secondPlace.referrerDisplayName}
                  emoji={"\uD83E\uDD48"}
                  size={56}
                />
              )}
              <PodiumAvatar
                profileHref={`/${sanitizeUsernameInput(firstPlace.referrerUsername)}`}
                imageUrl={firstPlace.referrerProfileImageUrl}
                name={firstPlace.referrerDisplayName}
                emoji={"\uD83E\uDD47"}
                size={96}
              />
              {thirdPlace && (
                <PodiumAvatar
                  profileHref={`/${sanitizeUsernameInput(thirdPlace.referrerUsername)}`}
                  imageUrl={thirdPlace.referrerProfileImageUrl}
                  name={thirdPlace.referrerDisplayName}
                  emoji={"\uD83E\uDD49"}
                  size={56}
                />
              )}
            </div>
          </div>
        )}

        <div className="mb-6 relative">
          <h1 className="text-2xl font-bold text-left">Referral Leaders</h1>
        </div>

        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
            {summaryStats.map((stat) => (
              <div
                key={stat.id}
                className="border border-gray-800 rounded-xl p-4 bg-transparent"
              >
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.valueClassName ?? ""}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-red-300 bg-red-50 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!error && entries.length === 0 && (
          <div className="border border-gray-800 rounded-xl p-6">
            <p className="text-gray-600 text-center py-8">No referrals found for this period.</p>
          </div>
        )}

        {entries.length > 0 && (
          <SortableLeaderboard
            entries={entries}
            filterControls={(
              <>
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
              </>
            )}
          />
        )}

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Frequently Asked Questions</h2>
          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}
