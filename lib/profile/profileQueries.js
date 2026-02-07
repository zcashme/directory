import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * Get total count of all profiles (internal implementation)
 */
async function getProfileCountImpl() {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true });

  if (error) {
    return 0;
  }

  return count || 0;
}

/**
 * Get total count of all profiles (cached version)
 * Cached for 5 minutes to align with home page ISR revalidation
 */
export const getProfileCount = unstable_cache(
  getProfileCountImpl,
  ["profile-count"],
  { revalidate: 300, tags: ["profile-count"] }
);

/**
 * Check if a username is verified (address_verified = true)
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if username exists AND is verified
 */
export async function checkUsernameIsVerified(username) {
  if (!username || !username.trim()) return false;

  const supabase = createSupabaseServerClient();
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
 * @param {string} name - Name to check
 * @returns {Promise<number>} Count of profiles with this name
 */
export async function getDuplicateNameCount(name) {
  if (!name || !name.trim()) return 0;

  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true })
    .ilike("name", name.trim());

  if (error) {
    return 0;
  }

  return count || 0;
}
