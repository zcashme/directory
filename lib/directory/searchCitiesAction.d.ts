// Type definitions for searchCitiesAction
import type { City } from "@/types";

export interface SearchCitiesResult {
  ok: boolean;
  data?: City[];
  error?: string;
}

export function searchCitiesAction(query: string): Promise<SearchCitiesResult>;
