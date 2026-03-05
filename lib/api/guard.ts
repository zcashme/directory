interface ApiGuardOptions {
  cacheSeconds?: number;
  public?: boolean;
}

interface ApiGuardSuccess {
  ok: true;
  cacheSeconds: number;
}

type ApiGuardResult = Response | ApiGuardSuccess;

const getApiKey = (request: Request): string | null =>
  request.headers.get("x-api-key") || request.headers.get("authorization");

export const enforceApiGuard = async (
  request: Request,
  { cacheSeconds = 0, public: isPublic = false }: ApiGuardOptions = {}
): Promise<ApiGuardResult> => {
  if (isPublic) {
    return { ok: true, cacheSeconds };
  }

  const expectedKey = process.env.API_KEY;
  if (!expectedKey) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const providedKey = getApiKey(request);
  if (!providedKey || providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { ok: true, cacheSeconds };
};

export const withCacheHeaders = (
  headers: Record<string, string>,
  cacheSeconds: number
): Record<string, string> => {
  if (!cacheSeconds) return headers;
  headers["Cache-Control"] = `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`;
  return headers;
};
