import {
  NsBenefitsGrid,
  NsExploreGrid,
  NsHero,
  NsOnboardingSteps,
  NsRewardsGrid,
  NsSectionGrid,
  NsWalletGrid,
} from "./NsLandingComponents";
import { getNsLandingPageContent, type NsLandingPageKey } from "./nsLandingContent";
import NsStaticPageShell from "./NsStaticPageShell";

export default function NsLandingPage({ slug }: { slug: NsLandingPageKey }) {
  const page = getNsLandingPageContent(slug);

  return (
    <NsStaticPageShell>
      <NsHero
        eyebrow={page.eyebrow}
        headline={page.headline}
        intro={page.intro}
        primaryAction={page.primaryAction}
        secondaryAction={page.secondaryAction}
        stats={page.stats}
      />
      {page.onboardingSteps?.length ? <NsOnboardingSteps steps={page.onboardingSteps} /> : null}
      {page.wallets?.length ? <NsWalletGrid wallets={page.wallets} /> : null}
      {page.rewards?.length ? <NsRewardsGrid rewards={page.rewards} /> : null}
      {page.benefits?.length ? <NsBenefitsGrid benefits={page.benefits} /> : null}
      {page.sections.length ? <NsSectionGrid sections={page.sections} /> : null}
      {!page.hideExploreMore ? <NsExploreGrid currentSlug={slug} /> : null}
    </NsStaticPageShell>
  );
}
