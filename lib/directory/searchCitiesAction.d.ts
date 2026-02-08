// Type definitions for searchCitiesAction
import type { City } from "@/lib/directory/types";

export interface SearchCitiesResult {
  ok: boolean;
  data?: City[];
  error?: string;
}

export function searchCitiesAction(_query: string): Promise<SearchCitiesResult>;
