"use server";

import cities from "@/data/world-cities.json";
import type { APIResponse } from "@/lib/api/types";
import { searchCities, type City, type WorldCity } from "@/lib/directory/searchCities";

export type { City };

export async function searchCitiesAction(query: string): Promise<APIResponse<City[]>> {
  try {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    return { ok: true, data: searchCities(query, cities as WorldCity[]) };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error), data: [] };
  }
}
