"use server";

import { getCachedTokens } from "./tokenCache";

/**
 * Server Action for fetching swap tokens
 * Used by SwapProvider to load available tokens
 */
export async function getSwapTokens() {
  try {
    const data = await getCachedTokens();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
