"use server";

import { searchCities } from "@/lib/directory/searchCities";

/**
 * Server Action for searching cities
 * Used by CitySearchDropdown component
 */
export async function searchCitiesAction(query) {
  try {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    const data = await searchCities(query.trim());
    return { ok: true, data };
  } catch (error) {
    console.error("Error searching cities:", error);
    return { ok: false, error: String(error?.message || error), data: [] };
  }
}
