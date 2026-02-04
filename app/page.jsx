import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const featuredProfiles = await fetchFeaturedProfilesServer(5);

  return <HomePage initialFeaturedProfiles={featuredProfiles} />;
}
