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
    answer:
      "Joined is signup date. Elig. Until is 4 weeks later. If they verify before that date, Activated = Yes. Then Active Until is 12 months after First Verif. Active stays Yes until that date. Earnings increase for each verification event recorded during the active window.",
  },
  {
    id: "faq-eligible-activated",
    question: "What makes a referral Eligible and Activated?",
    answer: (
      <>
        Eligible shows <span className="font-semibold">Yes</span> while the referral is still in the first{" "}
        <span className="font-semibold">4 weeks after Joined</span> (before Elig. Until) and First Verif. is missing.
        If there is no verification by Elig. Until, Eligible becomes{" "}
        <span className="font-semibold">No</span>. If verification happens during that eligibility window, Eligible
        shows a <span className="font-semibold">checkmark</span> (activated), and rewards can run for up to{" "}
        <span className="font-semibold">12 months from First Verif.</span>
        The Eligible summary count tracks only current <span className="font-semibold">Yes</span> rows.
      </>
    ),
  },
  {
    id: "faq-active-status",
    question: "What do Active, Active Until, Yes/No/N/a mean?",
    answer: (
      <>
        Active Until is First Verif. + 12 months for activated referrals. Active is{" "}
        <span className="font-semibold">Yes</span> when now is before Active Until,{" "}
        <span className="font-semibold">No</span> after it ends, and{" "}
        <span className="font-semibold">N/a</span> when rewards were never activated.
      </>
    ),
  },
  {
    id: "faq-auth-links",
    question: "What does Auth/Links mean?",
    answer: "Auth/Links is authenticated links over total links for that referred user. Example: 1/2 means 1 verified link out of 2 total links.",
  },
  {
    id: "faq-earned",
    question: "How is Earnings (zats) calculated?",
    answer: (
      <>
        Earnings are your referral payout total in zats. For each activated referral, each verification event during
        the 12-month active window can pay: minimum verification fee multiplied by commission rate. Commission starts at
        15%, adds profile bonuses (5% each for profile image, bio, and location, up to 15%), and adds link bonuses
        based on that referred user&apos;s authenticated links (10% per link), capped at 50%.
      </>
    ),
  },
  {
    id: "faq-payout-timing",
    question: "When is payout?",
    answer: "Each qualifying verification event is counted during the active window; Active Until is when earning stops.",
  },
  {
    id: "faq-zat",
    question: "What is a Zat?",
    answer:
      "A Zat means Zatoshi. 1 Zatoshi equals 0.00000001 ZEC. The easy way to think about it is: 100,000,000 zats = 1 ZEC.",
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

        <div className="flex flex-wrap items-center gap-4 mb-6">
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

        <ReferrerReferralsTable referrals={referrals as ReferrerReferralRow[]} />

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">Frequently Asked Questions</h2>
          <FAQAccordion items={REFERRER_FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}
