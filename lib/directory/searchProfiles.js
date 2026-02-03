import { supabase } from "@/lib/supabase/supabase-client";

export async function searchProfiles(query, limit = 20) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();

  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .or(`name.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order("name")
    .limit(limit);

  if (error) {
    console.error("Error searching profiles:", error);
    return [];
  }

  return data || [];
}
