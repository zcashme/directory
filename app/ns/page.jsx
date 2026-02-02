import DirectoryNS from "./DirectoryNS";
import { fetchProfilesWithRanks } from "@/lib/profile/profiles";

export const dynamic = "force-dynamic";

export default async function NsPage() {
  const profiles = await fetchProfilesWithRanks();

  return <DirectoryNS initialProfiles={profiles} />;
}
