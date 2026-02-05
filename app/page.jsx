import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";
import { getProfileCount } from "@/lib/profile/profileQueries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const featuredProfiles = await fetchFeaturedProfilesServer(5);
  const profileCount = await getProfileCount();

  return <HomePage initialFeaturedProfiles={featuredProfiles} profileCount={profileCount} />;
}
