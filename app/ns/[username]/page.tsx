import DirectoryNS from "../DirectoryNS";
import { fetchProfilesWithRanks } from "../profileRanker";
import { buildNsMetadata } from "../nsLandingContent";

interface NsProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = buildNsMetadata("directory");

export default async function NsProfilePage({ params }: NsProfilePageProps) {
  const { username } = await params;
  const profiles = await fetchProfilesWithRanks();

  return <DirectoryNS initialProfiles={profiles} initialActiveUsername={username} />;
}
