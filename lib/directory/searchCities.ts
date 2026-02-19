import cityTimezones from "city-timezones";
import type { City } from "@/lib/directory/types";

export async function searchCities(query: string): Promise<City[]> {
  if (!query || query.length < 2) return [];

  const results = cityTimezones.findFromCityStateProvince(query);

  return results.slice(0, 20).map((r: any) => ({
    city: r.city,
    city_ascii: r.city,
    admin_name: r.province || "",
    country: r.country,
  }));
}
