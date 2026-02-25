import type { Profile } from "@/lib/profile/types";

// ---------------------------------------------------------------------------
// Raw API response types (matches GET /api/directory)
// ---------------------------------------------------------------------------

interface DirectoryApiResult {
  id: number;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  address: string | null;
  address_verified: boolean;
  verified_at: string | null;
  authenticated_links: { id: number; label: string; url: string; is_verified: boolean }[];
  unauthenticated_links: { id: number; label: string; url: string; is_verified: boolean }[];
}

export interface DirectoryApiResponse {
  results: DirectoryApiResult[];
  next_cursor: string | null;
  exists?: boolean;
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

export function toProfile(r: DirectoryApiResult): Profile {
  return {
    id: r.id,
    name: r.username,
    display_name: r.display_name ?? undefined,
    profile_image_url: r.profile_image_url ?? undefined,
    bio: r.bio ?? undefined,
    nearest_city_name: r.nearest_city_name ?? undefined,
    address: r.address ?? "",
    address_verified: r.address_verified,
    last_verified_at: r.verified_at ?? undefined,
    verified_links_count: r.authenticated_links.length,
    links: [...r.authenticated_links, ...r.unauthenticated_links],
  };
}
