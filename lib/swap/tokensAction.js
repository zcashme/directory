"use server";

import { oneclickTokens } from "@/lib/swap/oneClick";
import { unstable_cache } from "next/cache";

// Cache tokens using Next.js 16 Data Cache
// Note: For Server Actions, unstable_cache is the recommended approach in Next.js 16
// This persists across Vercel serverless invocations using Vercel's Data Cache infrastructure
const getCachedTokens = unstable_cache(
  async () => {
    return await oneclickTokens();
  },
  ["oneclick-tokens"], // cache key
  {
    revalidate: 300, // 5 minutes in seconds
    tags: ["tokens"], // for cache invalidation via revalidateTag("tokens")
  }
);

export async function getSwapTokens() {
  try {
    const data = await getCachedTokens();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
