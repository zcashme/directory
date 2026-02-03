import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function fetchFeaturedProfilesServer(limit = 6) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("featured", true)
    .limit(limit + 10); // Fetch a few extra to allow shuffling

  if (error) {
    console.error("Error fetching featured profiles:", error);
    return [];
  }

  // Shuffle and return requested limit
  const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
