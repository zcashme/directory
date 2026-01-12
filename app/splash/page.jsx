import SplashPage from "../../src/pages/SplashPage";
import { fetchProfilesWithRanks } from "../../lib/profiles";

export const dynamic = "force-dynamic";

export default async function SplashRoute() {
  const profiles = await fetchProfilesWithRanks();
  return <SplashPage initialProfiles={profiles} />;
}
