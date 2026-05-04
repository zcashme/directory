import DirectoryNS from "./DirectoryNS";
import { fetchProfilesWithRanks } from "./profileRanker";
import { buildNsMetadata } from "./nsLandingContent";

export const dynamic = "force-dynamic";

export const metadata = buildNsMetadata("directory");

interface NsPageProps {
  searchParams?: Promise<{
    search?: string;
  }>;
}

export default async function NsPage({ searchParams }: NsPageProps) {
  const profiles = await fetchProfilesWithRanks();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialSearch = resolvedSearchParams?.search?.trim() ?? "";

  return <DirectoryNS initialProfiles={profiles} initialSearch={initialSearch} />;
}
