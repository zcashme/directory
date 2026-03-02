import type { ReactElement, ReactNode } from "react";
import {
  getLeaderboardAction,
  type Period,
} from "@/lib/leaderboard/getLeaderboardAction";
import {
  PodiumAvatar,
  SortableLeaderboard,
  LeaderboardPeriodTitle,
  FAQAccordion,
} from "./LeaderboardClient";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";

const VALID_PERIODS = new Set<string>(["daily", "weekly", "monthly", "alltime"]);

function isValidPeriod(value: string | undefined): value is Period {
  return typeof value === "string" && VALID_PERIODS.has(value);
}

const FAQ_ITEMS: Array<{ id: string; question: string; answer: string | ReactElement }> = [
  {
    id: "faq-verification",
    question: "Do I need to be verified to appear on the leaderboard?",
    answer: (
      <>
        <span className="block">Yes.</span>
        <span className="block">You must verify your address to show up in the list.</span>
        <span className="block">Your friend must also verify before they help your score.</span>
      </>
    ),
  },
  {
    id: "faq-how-to-refer",
    question: "How can I refer someone?",
    answer: (
      <>
        <span className="block">There are two ways.</span>
        <span className="block">They can visit your profile at zcash.me/{`{your_username}`} and tap Join at the top right.</span>
        <span className="block">Or you can share this direct link: zcash.me/{`{your_username}`}/refer.</span>
      </>
    ),
  },
  {
    id: "faq-eligible",
    question: "What makes a referral 'Eligible'?",
    answer: (
      <>
        <span className="block">After signup, your friend has 4 weeks to verify for the first time.</span>
        <span className="block">While they are in that 4-week window, you see Eligible = Yes.</span>
        <span className="block">If they verify in time, they can earn commission for you.</span>
        <span className="block">If they miss that window, they do not earn commission for you.</span>
      </>
    ),
  },
  {
    id: "faq-active",
    question: "What are 'Active Rewards'?",
    answer: (
      <>
        <span className="block">Once your friend verifies, a 12-month timer starts.</span>
        <span className="block">You earn from each verification during those 12 months.</span>
        <span className="block">After that date, new verifications pay 0.</span>
      </>
    ),
  },
  {
    id: "faq-earned",
    question: "How are rewards calculated?",
    answer: (
      <>
        <span className="block">You get paid per verification, not per person.</span>
        <span className="block">Payment for one verification = fee x your commission rate.</span>
        <span className="block">Your rate starts at 15%.</span>
        <span className="block">It goes up for profile setup and for your friend&apos;s verified links.</span>
        <span className="block">The rate cannot go above 50%.</span>
      </>
    ),
  },
  {
    id: "faq-payout-timing",
    question: "When is payout?",
    answer: (
      <>
        <span className="block">Commission builds up while the referral is active.</span>
        <span className="block">Payout is made after Active Until, when that earning window ends.</span>
      </>
    ),
  },
  {
    id: "faq-zat",
    question: "What is a Zat?",
    answer: (
      <>
        <span className="block">A Zat means Zatoshi.</span>
        <span className="block">1 Zatoshi equals 0.00000001 ZEC.</span>
        <span className="block">100,000,000 zats = 1 ZEC.</span>
      </>
    ),
  },
];

function formatZats(value: number): string {
  return Math.round(value * 100000000).toLocaleString("en-US");
}

function formatPeriodDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  const periodStartLabel = formatPeriodDate(response.periodWindow.startIso);
  const periodEndLabel = formatPeriodDate(response.periodWindow.endIso);
  const periodRangeLabel = `${periodStartLabel} - ${periodEndLabel}`;

  const totalReferrals = entries.reduce((sum, e) => sum + e.totalReferrals, 0);
  const totalVerified = entries.reduce((sum, e) => sum + e.verifiedReferrals, 0);
  const totalEarned = entries.reduce((sum, e) => sum + e.totalEarnedToDate, 0);

  const summaryStats: Array<{
    id: string;
    label: string;
    value: ReactNode;
    valueClassName?: string;
    cardClassName?: string;
  }> = [
    {
      id: "totalEarned",
      label: "Earned (zats)",
      value: formatZats(totalEarned),
      valueClassName: "text-amber-600",
      cardClassName: "col-span-2 sm:col-span-1",
    },
    { id: "totalReferrals", label: "Referrals", value: totalReferrals },
    {
      id: "verified",
      label: "Verif. Refs",
      value: totalVerified,
      valueClassName: "text-green-600",
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
          <LeaderboardPeriodTitle period={period} />
          <p className="mt-1 text-sm text-gray-600 text-center">{periodRangeLabel}</p>
        </div>

        {!error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 mb-6">
            {summaryStats.map((stat) => (
              <div
                key={stat.id}
                className={`border border-gray-800 rounded-xl p-4 bg-transparent ${stat.cardClassName ?? ""}`}
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

        {!error && (
          <SortableLeaderboard
            entries={entries}
            emptyMessage="No referrals found for this period."
          />
        )}

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">Frequently Asked Questions</h2>
          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}
