import { NextResponse } from "next/server";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";

const FEATURED_LIMIT = 5;

export async function GET() {
  const profiles = await fetchFeaturedProfilesServer(FEATURED_LIMIT);
  return NextResponse.json(
    { profiles },
    { status: 200, headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } }
  );
}
