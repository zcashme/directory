import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function searchCities(query) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("worldcities")
    .select("id, city_ascii, city, admin_name, country")
    .ilike("city_ascii", `%${query}%`)
    .limit(20);
  if (error) return [];
  return data || [];
}
