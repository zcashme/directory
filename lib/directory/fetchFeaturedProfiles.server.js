import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function fetchFeaturedProfilesServer(limit = 6) {
  const supabase = createSupabaseServerClient();
  // First, get count of all featured profiles
  const { count } = await supabase
    .from("zcasher_searchable")
    .select("*", { count: "exact", head: true })
    .eq("featured", true);

  if (!count || count === 0) return [];

  // Fetch all featured profiles and randomly select
  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("featured", true);

  // Randomly shuffle and take the requested limit
  return (data || []).sort(() => Math.random() - 0.5).slice(0, limit);
}
