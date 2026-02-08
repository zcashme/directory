import { NextRequest, NextResponse } from "next/server";
import { searchProfiles, checkUsernameExists } from "@/lib/directory/searchProfiles";
import type { SearchProfilesResponse } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse<SearchProfilesResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "3", 10);

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({
        profiles: [],
        exists: false
      });
    }

    const trimmedQuery = query.trim();

    // Run both queries in parallel
    const [profiles, exists] = await Promise.all([
      searchProfiles(trimmedQuery, limit),
      checkUsernameExists(trimmedQuery)
    ]);

    return NextResponse.json({
      profiles,
      exists
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Search failed", profiles: [], exists: false },
      { status: 500 }
    );
  }
}
