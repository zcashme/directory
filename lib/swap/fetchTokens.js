"use server";

import { unstable_cache } from "next/cache";
import { oneclickTokens } from "./oneClick";

const CACHE_KEY = "oneclick-tokens";
const CACHE_REVALIDATE = 300; // 5 minutes in seconds
const CACHE_TAGS = ["tokens"]; // for cache invalidation via revalidateTag("tokens")

export const getCachedTokens = unstable_cache(
  async () => {
    return await oneclickTokens();
  },
  [CACHE_KEY],
  {
    revalidate: CACHE_REVALIDATE,
    tags: CACHE_TAGS,
  }
);

/**
 * Server Action for fetching swap tokens
 * Used by SwapProvider to load available tokens
 */

export async function getSwapTokens() {
  const result = await getCachedTokens();
  if (result.error) {
    return { ok: false, error: result.error, retryable: true };
  }
  return { ok: true, data: result };
}
