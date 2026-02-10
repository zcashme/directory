import { lookupSocialAddress } from "../../../../../lib/profile/social-lookup";
import { enforceApiGuard, withCacheHeaders } from "../../../../../lib/api/guard";

interface RouteParams {
  params: Promise<{
    platform: string;
    handle: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 300 });
  if (guard instanceof Response) return guard;

  const resolvedParams = await params;
  const platform = resolvedParams?.platform || "";
  const handle = resolvedParams?.handle || "";
  const result = await lookupSocialAddress(platform, handle);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: withCacheHeaders(
      { "Content-Type": "application/json" },
      guard.cacheSeconds
    ),
  });
}
