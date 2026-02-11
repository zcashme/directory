import type { Metadata } from "next";
import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";
import { getProfileCount } from "@/lib/profile/profileQueries";

// Disable ISR — always serve fresh content on every request
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

export default async function Page() {
  const featuredProfiles = await fetchFeaturedProfilesServer(5);
  const profileCount = await getProfileCount();

  return <HomePage initialFeaturedProfiles={featuredProfiles} profileCount={profileCount} />;
}
