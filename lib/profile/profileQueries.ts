import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

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

  return count || 0;
}

/**
 * Check if a username is verified (address_verified = true)
 * @param username - Username to check
 * @returns True if username exists AND is verified
 */
export async function checkUsernameIsVerified(username: string): Promise<boolean> {
  if (!username || !username.trim()) return false;

  const supabase = createSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("id, address_verified")
    .ilike("name", username.trim())
    .limit(1);

  if (error || !data || data.length === 0) {
    return false;
  }

  return data[0].address_verified === true;
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

  return count || 0;
}
