import Link from "next/link";
import type { ReactNode } from "react";
import {
  nsLandingOrder,
  nsLandingPages,
  type NsLandingAction,
  type NsLandingBenefit,
  type NsLandingPageKey,
  type NsLandingReward,
  type NsLandingSection,
  type NsLandingStep,
  type NsLandingWallet,
} from "./nsLandingContent";
import { FILTER_BASE } from "./directoryNsStyles";
import { getNsActionIconKeyFromHref, NsActionIcon } from "./nsActionIcons";

function NsActionLink({ action, primary = false }: { action: NsLandingAction; primary?: boolean }) {
  const iconKey = getNsActionIconKeyFromHref(action.href);
  const interactionClassName = `${FILTER_BASE} justify-center gap-2 tracking-[0.18em] md:hover:scale-[1.03] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900`;
  const className = primary
    ? `${interactionClassName} bg-[#f6b223] text-gray-900 md:hover:bg-[#ffd36b] active:bg-[#efb63a]`
    : `${interactionClassName} bg-white text-gray-900 md:hover:bg-[#fff3cc] active:bg-[#f2e3ad]`;

  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
        {action.iconSrc ? <img src={action.iconSrc} alt="" className="h-4 w-4" aria-hidden="true" /> : null}
        {!action.iconSrc && iconKey ? <NsActionIcon iconKey={iconKey} /> : null}
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {action.iconSrc ? <img src={action.iconSrc} alt="" className="h-4 w-4" aria-hidden="true" /> : null}
      {!action.iconSrc && iconKey ? <NsActionIcon iconKey={iconKey} /> : null}
      {action.label}
    </Link>
  );
}

export function NsPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f2] text-gray-900">
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-24 sm:pt-28">{children}</div>
    </div>
  );
}

export function NsHero({
  eyebrow,
  headline,
  intro,
  primaryAction,
  secondaryAction,
  extraActions,
  stats,
}: {
  eyebrow: string;
  headline: string;
  intro: string;
  primaryAction: NsLandingAction;
  secondaryAction?: NsLandingAction;
  extraActions?: NsLandingAction[];
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="relative overflow-hidden border border-gray-900 bg-white px-5 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(246,178,35,0.24),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,214,0.88))]"
      />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9a5b00]">{eyebrow}</div>
          <h1 className="mt-3 max-w-3xl text-3xl font-black uppercase tracking-tight sm:text-4xl lg:text-5xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <NsActionLink action={primaryAction} primary />
            {secondaryAction ? <NsActionLink action={secondaryAction} /> : null}
            {extraActions?.map((action) => (
              <NsActionLink key={action.href} action={action} />
            ))}
          </div>
        </div>
        {stats.length > 0 ? (
          <div className="grid gap-3 self-start">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-gray-900 bg-[#f7f7f2] px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">{stat.label}</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function NsSectionGrid({ sections }: { sections: NsLandingSection[] }) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <article key={section.title} className="border border-gray-900 bg-white px-5 py-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a5b00]">{section.eyebrow}</div>
          <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-gray-900">{section.title}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-700">{section.body}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-800">
            {section.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 bg-[#f6b223]" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

export function NsOnboardingSteps({ steps }: { steps: NsLandingStep[] }) {
  return (
    <section className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Onboarding</div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {steps.map((step) => (
          <article key={step.number} className="border border-gray-900 bg-white px-5 py-5">
            <div className="inline-flex h-8 w-8 items-center justify-center border border-gray-900 bg-[#f6b223] text-sm font-black text-gray-900">
              {step.number}
            </div>
            <h2 className="mt-3 text-xl font-black uppercase tracking-tight text-gray-900">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-700">{step.body}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-800">
              {step.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-[#f6b223]" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NsWalletGrid({ wallets }: { wallets: NsLandingWallet[] }) {
  return (
    <section className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Wallets</div>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {wallets.map((wallet) => (
          <article key={wallet.name} className="border border-gray-900 bg-white px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">{wallet.name}</h2>
              <a
                href={wallet.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-900 bg-[#f6b223] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-900"
              >
                Open
              </a>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-700">{wallet.summary}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-800">
              {wallet.strengths.map((strength) => (
                <li key={strength} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-[#f6b223]" aria-hidden="true" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NsRewardsGrid({ rewards }: { rewards: NsLandingReward[] }) {
  return (
    <section className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Airdrop</div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {rewards.map((reward) => (
          <article key={`${reward.amount}-${reward.title}`} className="border border-gray-900 bg-white px-5 py-5">
            <div className="text-2xl font-black uppercase tracking-tight text-gray-900">{reward.amount}</div>
            <h2 className="mt-2 text-base font-black uppercase tracking-tight text-[#9a5b00]">{reward.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-700">{reward.requirement}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NsBenefitsGrid({ benefits }: { benefits: NsLandingBenefit[] }) {
  return (
    <section className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Benefits</div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {benefits.map((benefit) => (
          <article key={benefit.title} className="border border-gray-900 bg-white px-5 py-5">
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">{benefit.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-700">{benefit.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NsExploreGrid({ currentSlug }: { currentSlug: NsLandingPageKey }) {
  const pages = nsLandingOrder.map((slug) => nsLandingPages[slug]).filter((page) => page.slug !== currentSlug);

  return (
    <section className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Explore More</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.slug}
            href={`/ns/${page.slug}`}
            className="border border-gray-900 bg-white px-4 py-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a5b00]">{page.eyebrow}</div>
            <div className="mt-2 text-base font-black uppercase tracking-tight text-gray-900">{page.headline}</div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{page.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NsDirectoryHero({
  children,
  countSummary,
  extraActions,
}: {
  children: ReactNode;
  countSummary: ReactNode;
  extraActions: NsLandingAction[];
}) {
  const directory = nsLandingPages.directory;

  return (
    <section className="relative overflow-hidden border border-gray-900 bg-white px-5 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(246,178,35,0.24),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,214,0.88))]"
      />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.95fr)]">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9a5b00]">{directory.eyebrow}</div>
          <h1 className="mt-3 max-w-3xl text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {directory.headline}
          </h1>
          <div className="mt-4 max-w-2xl text-sm leading-6 text-gray-700">{countSummary}</div>
          <div className="mt-6 flex flex-wrap gap-3">
            <NsActionLink action={directory.primaryAction} primary />
            {directory.secondaryAction ? <NsActionLink action={directory.secondaryAction} /> : null}
            {extraActions.map((action) => (
              <NsActionLink key={action.href} action={action} />
            ))}
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
