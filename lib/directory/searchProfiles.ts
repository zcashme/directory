import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * Check if a username exists (exact match, case-insensitive)
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  if (!username || !username.trim()) return false;

  const supabase = createSupabaseServerClient();
  if (!supabase) return false;

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
