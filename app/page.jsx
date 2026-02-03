import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Fetch featured profiles server-side - data arrives with the HTML
  const featuredProfiles = await fetchFeaturedProfilesServer(6);

  return <HomePage initialFeaturedProfiles={featuredProfiles} />;
}
