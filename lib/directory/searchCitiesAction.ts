"use server";

import cityTimezones from "city-timezones";
import type { APIResponse } from "@/lib/api/types";

export interface City {
  city: string;
  city_ascii: string;
  admin_name: string;
  country: string;
}

export async function searchCitiesAction(query: string): Promise<APIResponse<City[]>> {
  try {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { ok: true, data: [] };
    }

    const results = cityTimezones.findFromCityStateProvince(query.trim());
    const data: City[] = results.slice(0, 20).map((r: any) => ({
      city: r.city,
      city_ascii: r.city,
      admin_name: r.province || "",
      country: r.country,
    }));

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error), data: [] };
  }
}
