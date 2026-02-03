import { supabase } from "@/lib/supabase/supabase-client";

export async function fetchFeaturedProfiles(limit = 6) {
  const { data, error } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("featured", true)
    .limit(limit);

  if (error) {
    console.error("Error fetching featured profiles:", error);
    return [];
  }

  // Shuffle the results to get random featured profiles
  const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
