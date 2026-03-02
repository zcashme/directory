import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { getReferrerStatsAction } from "@/lib/leaderboard/getReferrerStatsAction";
import { buildSlug } from "@/lib/profile/profileUtils";
import ReferRankBadgeMulti from "@/ui/ns-directory/ReferRankBadgeMulti";
import {
  FAQAccordion,
  LeaderAvatar,
  ReferralLinkCopy,
  ReferrerReferralsTable,
  type ReferrerReferralRow,
} from "../LeaderboardClient";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";

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
    title: `${referrer.displayName}'s Referrals - ZcashMe`,
    description: `Referral stats for ${referrer.displayName} on ZcashMe`,
  };
}

const REFERRER_FAQ_ITEMS: Array<{ id: string; question: string; answer: string | ReactElement }> = [
  {
    id: "faq-columns",
    question: "How do these columns connect from Joined to Earnings?",
    answer: (
      <>
        <span className="block">Joined is when your friend signed up.</span>
        <span className="block">Elig. Until is Joined + 4 weeks.</span>
        <span className="block">First Verif. is the first time they verified.</span>
        <span className="block">Active Until is First Verif. + 12 months.</span>
        <span className="block">Count Verifs. is how many times they verified before Active Until.</span>
        <span className="block">Commission is the total from those counted verifications.</span>
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
    id: "faq-eligible-activated",
    question: "What makes a referral Eligible and Activated?",
    answer: (
      <>
        <span className="block">Eligible = Yes means they are still in the first 4 weeks after signup.</span>
        <span className="block">Eligible = checkmark means they verified in time.</span>
        <span className="block">Eligible = No means they did not verify in time.</span>
        <span className="block">Only checkmark rows can earn commission.</span>
      </>
    ),
  },
  {
    id: "faq-active-status",
    question: "What do Active, Active Until, Yes/No/N/a mean?",
    answer: (
      <>
        <span className="block">Active Until is the date when earning stops for that friend.</span>
        <span className="block">Active = Yes means today is still before that date.</span>
        <span className="block">Active = No means that date already passed.</span>
        <span className="block">Active = N/a means they never qualified to earn.</span>
      </>
    ),
  },
  {
    id: "faq-auth-links",
    question: "What does Auth/Links mean?",
    answer: (
      <>
        <span className="block">Auth/Links shows how many of their links are verified.</span>
        <span className="block">Example: 1/2 means 1 verified link out of 2 links.</span>
        <span className="block">More verified links can increase your commission rate.</span>
      </>
    ),
  },
  {
    id: "faq-earned",
    question: "How is Earnings (zats) calculated?",
    answer: (
      <>
        <span className="block">Earnings is the sum of all counted commission payments.</span>
        <span className="block">Each counted verification pays: fee x commission rate.</span>
        <span className="block">The rate starts at 15% and can go up.</span>
        <span className="block">The rate is capped at 50%.</span>
        <span className="block">Only verifications before Active Until are counted.</span>
      </>
    ),
  },
  {
    id: "faq-payout-timing",
    question: "When is payout?",
    answer: (
      <>
        <span className="block">Commission builds up while that referral is active.</span>
        <span className="block">Payout is made after Active Until, when the earning window ends.</span>
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

export default async function ReferrerStatsPage({ params }: PageProps) {
  const { username } = await params;
  const response = await getReferrerStatsAction(username);

  if (!response.ok || !response.referrer) {
    notFound();
  }

  const { referrer, referrals } = response;
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const directHost = requestHeaders.get("host");
  const rawHost = (forwardedHost ?? directHost ?? "").split(",")[0].trim();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() ?? "zcash.me";
  const profileHost = rawHost
    ? rawHost.replace(/^(leader|leaders)\./i, "")
    : baseDomain;
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : profileHost.includes("localhost") || profileHost.endsWith(".local")
      ? "http"
      : "https";
  const profileOrigin = `${protocol}://${profileHost}`;
  const profileSlug = buildSlug({
    id: referrer.id,
    name: referrer.username,
    address_verified: referrer.addressVerified,
  });
  const profileHref = `${profileOrigin}/${profileSlug || sanitizeUsernameInput(referrer.username)}`;
  const referralUrl = `${profileOrigin}/${sanitizeUsernameInput(referrer.username)}/refer`;
  const displayUsername = referrer.addressVerified ? referrer.username : `${referrer.username}-${referrer.id}`;
  const awards = [
    { id: "alltime", rank: referrer.rankAlltime, period: "all" as const },
    { id: "weekly", rank: referrer.rankWeekly, period: "weekly" as const },
    { id: "monthly", rank: referrer.rankMonthly, period: "monthly" as const },
  ].filter((item) => typeof item.rank === "number" && item.rank > 0 && item.rank <= 10);

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-6 md:pt-8"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--color-brand-blue)] mb-6"
        >
          <span
            aria-hidden
            className="inline-flex items-center justify-center text-base leading-none text-current"
          >
            {"\u25C2"}
          </span>
          <span>Leaderboard</span>
        </Link>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <Link href={profileHref} className="shrink-0 transition-transform duration-150 hover:scale-110">
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
                /{displayUsername}
              </Link>
            </div>
            {awards.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {awards.map((award) => (
                  <ReferRankBadgeMulti
                    key={award.id}
                    rank={award.rank}
                    period={award.period}
                    alwaysOpen
                  />
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto w-full sm:w-auto sm:min-w-[300px] flex justify-end">
            <ReferralLinkCopy referralUrl={referralUrl} />
          </div>
        </div>

        <ReferrerReferralsTable referrals={referrals as ReferrerReferralRow[]} />

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">Frequently Asked Questions</h2>
          <FAQAccordion items={REFERRER_FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}
