"use server";

import { searchCities } from "@/lib/directory/searchCities";
import type { SearchCitiesResponse } from "@/types/api";

/**
 * Server Action for searching cities
 * Used by CitySearchDropdown component
 */
export async function searchCitiesAction(query: string): Promise<SearchCitiesResponse> {
  try {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    const data = await searchCities(query.trim());
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error), data: [] };
  }
}
