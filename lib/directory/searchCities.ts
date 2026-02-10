import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { City } from "@/lib/directory/types";

export async function searchCities(query: string): Promise<City[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("worldcities")
    .select("id, city_ascii, city, admin_name, country")
    .ilike("city_ascii", `%${query}%`)
    .limit(20);
  if (error) return [];
  return data || [];
}
