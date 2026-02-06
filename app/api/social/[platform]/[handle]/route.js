import { lookupSocialAddress } from "../../../../../lib/social-lookup";
import { enforceApiGuard, withCacheHeaders } from "../../../../../lib/api-guard";

export async function GET(request, { params }) {
  const guard = await enforceApiGuard(request, { cacheSeconds: 300 });
  if (guard instanceof Response) return guard;
  const platform = params?.platform || "";
  const handle = params?.handle || "";
  const result = await lookupSocialAddress(platform, handle);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: withCacheHeaders(
      { "Content-Type": "application/json" },
      guard.cacheSeconds
    ),
  });
}
