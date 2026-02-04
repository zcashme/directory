import { supabase } from "@/lib/supabase/supabase-client";

/**
 * Get total count of all profiles
 */
export async function getProfileCount() {
  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error getting profile count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Find a single profile by exact address match
 * @param {string} address - Zcash address to search for
 * @returns {Promise<object|null>} Profile object or null if not found
 */
export async function findProfileByAddress(address) {
  if (!address || !address.trim()) return null;

  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("address", address.trim())
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if a username is verified (address_verified = true)
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if username exists AND is verified
 */
export async function checkUsernameIsVerified(username) {
  if (!username || !username.trim()) return false;

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

  const { count, error } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true })
    .ilike("name", name.trim());

  if (error) {
    console.error("Error getting duplicate name count:", error);
    return 0;
  }

  return count || 0;
}
