"use server";

import { isZnsNameAvailable } from "./client";

export async function getClaimNameAvailability(name: string): Promise<"available" | "unavailable" | "unknown"> {
  try {
    return await isZnsNameAvailable(name) ? "available" : "unavailable";
  } catch {
    return "unknown";
  }
}
