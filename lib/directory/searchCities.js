import { supabase } from "@/lib/supabase/supabase-client";

export async function searchCities(query) {
  const { data, error } = await supabase
    .from("worldcities")
    .select("id, city_ascii, city, admin_name, country")
    .ilike("city_ascii", `%${query}%`)
    .limit(20);
  if (error) return [];
  return data || [];
}
