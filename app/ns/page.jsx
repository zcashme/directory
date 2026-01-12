import DirectoryNS from "../../src/DirectoryNS";
import { fetchProfilesWithRanks } from "../../lib/profiles";

export const dynamic = "force-dynamic";

export default async function NsPage() {
  const profiles = await fetchProfilesWithRanks();

  return <DirectoryNS initialProfiles={profiles} />;
}
