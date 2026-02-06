import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";
import { getProfileCount } from "@/lib/profile/profileQueries";

// Use ISR instead of force-dynamic to allow caching with periodic revalidation
export const revalidate = 60; // Revalidate every 60 seconds

export default async function Page() {
  const featuredProfiles = await fetchFeaturedProfilesServer(5);
  const profileCount = await getProfileCount();

  return <HomePage initialFeaturedProfiles={featuredProfiles} profileCount={profileCount} />;
}
