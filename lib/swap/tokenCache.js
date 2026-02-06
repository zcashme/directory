"use server";

import { unstable_cache } from "next/cache";
import { oneclickTokens } from "./oneClick";

/**
 * Shared cached token function for swap operations
 * 
 * Uses Next.js 16 Data Cache via unstable_cache which persists across
 * Vercel serverless invocations using Vercel's Data Cache infrastructure.
 * 
 * Cache configuration:
 * - Revalidation: 5 minutes (300 seconds)
 * - Tags: ["tokens"] for cache invalidation via revalidateTag("tokens")
 * - Key: ["oneclick-tokens"]
 */
export const getCachedTokens = unstable_cache(
  async () => {
    return await oneclickTokens();
  },
  ["oneclick-tokens"], // cache key
  {
    revalidate: 300, // 5 minutes in seconds
    tags: ["tokens"], // for cache invalidation via revalidateTag("tokens")
  }
);
