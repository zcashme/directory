import { oneclickTokens } from "../../../../lib/oneClick";
import { unstable_cache } from "next/cache";

// Route segment config: controls caching behavior for Next.js 16
export const revalidate = 300; // Revalidate at most every 5 minutes (300 seconds)

// Cache tokens using Next.js 16 Data Cache
// Note: For API routes, unstable_cache is still the recommended approach in Next.js 16
// The "use cache" directive is for React Server Components, not API routes
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

export async function GET() {
  try {
    const data = await getCachedTokens();
    return Response.json(
      { ok: true, data },
      {
        headers: {
          "Content-Type": "application/json",
          // HTTP cache headers for CDN/edge caching (Vercel Edge Network)
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
