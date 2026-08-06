"use server";

import { cities } from "world-cities-json";
import type { APIResponse } from "@/lib/api/types";

export interface City {
  city: string;
  city_ascii: string;
  admin_name: string;
  country: string;
  iso2: string;
}

export async function searchCitiesAction(query: string): Promise<APIResponse<City[]>> {
  try {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    const q = query.trim().toLowerCase();
    const data: City[] = cities
      .filter((c) => c.city_ascii?.toLowerCase().includes(q))
      .slice(0, 20)
      .map((c) => ({
        city: c.city,
        city_ascii: c.city_ascii,
        admin_name: c.admin_name || "",
        country: c.country,
        iso2: c.iso2,
      }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error), data: [] };
  }
}