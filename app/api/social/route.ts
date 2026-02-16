import { lookupSocialAddress } from "@/lib/profile/social-lookup";
import { enforceApiGuard, withCacheHeaders } from "@/lib/api/guard";

export async function GET(request: Request): Promise<Response> {
  const guard = await enforceApiGuard(request, { cacheSeconds: 300 });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "";
  const handle = searchParams.get("handle") || "";

  if (!platform || !handle) {
    return new Response(
      JSON.stringify({ error: "missing_parameters", platform: null, handle: null }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const result = await lookupSocialAddress(platform, handle);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: withCacheHeaders(
      { "Content-Type": "application/json" },
      guard.cacheSeconds
    ),
  });
}
