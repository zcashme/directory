import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { normalizeUsernameForCompare } from "@/lib/profile/usernamePolicy";

/**
 * Get total count of all profiles
 */
export async function getProfileCount(): Promise<number> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true });

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export interface UsernameAvailability {
  exists: boolean;
  verifiedExists: boolean;
  takenByOtherVerified: boolean;
}

export async function getUsernameAvailability(
  username: string,
  currentProfileId?: number
): Promise<UsernameAvailability> {
  if (!username || !username.trim()) {
    return { exists: false, verifiedExists: false, takenByOtherVerified: false };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { exists: false, verifiedExists: false, takenByOtherVerified: false };
  }

  const compareTarget = normalizeUsernameForCompare(username);
  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("id,name,address_verified")
    .ilike("name", username.trim());

  if (error || !Array.isArray(data)) {
    return { exists: false, verifiedExists: false, takenByOtherVerified: false };
  }

  const matches = data.filter((row: { name?: string }) =>
    normalizeUsernameForCompare(row.name ?? "") === compareTarget
  );
  const exists = matches.length > 0;
  const verifiedMatches = matches.filter((row: { address_verified?: boolean }) =>
    row.address_verified === true
  );
  const verifiedExists = verifiedMatches.length > 0;
  const takenByOtherVerified = verifiedMatches.some((row: { id?: number }) =>
    typeof currentProfileId === "number" ? row.id !== currentProfileId : true
  );

  return { exists, verifiedExists, takenByOtherVerified };
}

/**
 * Get duplicate name count for a specific name (on-demand query)
 * @param name - Name to check
 * @returns Count of profiles with this name
 */
export async function getDuplicateNameCount(name: string): Promise<number> {
  if (!name || !name.trim()) return 0;

  const supabase = createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true })
    .ilike("name", name.trim());

  if (error) {
    return 0;
  }

  return count ?? 0;
}
