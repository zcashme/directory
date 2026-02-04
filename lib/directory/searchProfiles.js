import { supabase } from "@/lib/supabase/supabase-client";

/**
 * Search profiles with character-length-based filtering:
 * - 1 char: search only 1-character usernames
 * - 2 chars: search 2-3 character usernames
 * - 3+ chars: search all usernames
 */
export async function searchProfiles(query, limit = 20) {
  if (!query || !query.trim()) return [];

  const q = query.trim();
  const length = q.length;

  let queryBuilder = supabase
    .from("zcasher_searchable")
    .select("*");

  if (length === 1) {
    // Single character: only search 1-character usernames (exact match, case-insensitive)
    queryBuilder = queryBuilder.ilike("name", q);
  } else if (length === 2) {
    // Two characters: search usernames starting with these 2 chars (we'll filter to 2-3 chars client-side)
    queryBuilder = queryBuilder.ilike("name", `${q}%`);
  } else {
    // Three or more: search all (partial match on name and display_name)
    queryBuilder = queryBuilder.or(`name.ilike.%${q}%,display_name.ilike.%${q}%`);
  }

  const { data, error } = await queryBuilder
    .order("name")
    .limit(limit * 2); // Get more results to filter client-side if needed

  if (error) {
    return [];
  }

  // Filter results to match length requirements (client-side filtering for precision)
  let filtered = data || [];

  if (length === 1) {
    // Only 1-character usernames (case-insensitive match)
    filtered = filtered.filter(p => {
      const name = (p.name || "").trim();
      return name.length === 1 && name.toLowerCase() === q.toLowerCase();
    });
  } else if (length === 2) {
    // Only 2-3 character usernames that start with the query
    const qLower = q.toLowerCase();
    filtered = filtered.filter(p => {
      const name = (p.name || "").trim();
      const nameLower = name.toLowerCase();
      const nameLen = name.length;
      return nameLen >= 2 && nameLen <= 3 && nameLower.startsWith(qLower);
    });
  }

  return filtered.slice(0, limit);
}

/**
 * Check if a username exists (exact match, case-insensitive)
 */
export async function checkUsernameExists(username) {
  if (!username || !username.trim()) return false;

  const q = username.trim().toLowerCase();

  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("id")
    .ilike("name", q)
    .limit(1);

  if (error) {
    return false;
  }

  return data && data.length > 0;
}
