import type { Metadata } from "next";
import DirectoryNS from "./DirectoryNS";
import { fetchProfilesWithRanks } from "./profileRanker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Name Service Directory - Zcash.me",
  description: "Browse Zcash profiles with verified name service entries.",
};

export default async function NsPage() {
  const profiles = await fetchProfilesWithRanks();

  return <DirectoryNS initialProfiles={profiles} />;
}
