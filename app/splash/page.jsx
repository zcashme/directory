import SplashPage from "./SplashPage";
import { fetchProfilesWithRanks } from "@/lib/profile/profiles";

export const dynamic = "force-dynamic";

export default async function SplashRoute() {
  const profiles = await fetchProfilesWithRanks();
  return <SplashPage initialProfiles={profiles} />;
}
