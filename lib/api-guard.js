const getHeader = (request, name) => request.headers.get(name);

const getClientIp = (request) => {
  const forwarded = getHeader(request, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return getHeader(request, "x-real-ip") || "unknown";
};

const getApiKey = (request) =>
  getHeader(request, "x-api-key") || getHeader(request, "authorization");

const getRateLimiter = () => {
  if (!globalThis.__apiRateLimit) {
    globalThis.__apiRateLimit = new Map();
  }
  return globalThis.__apiRateLimit;
};

const isAllowed = (key, limit, windowMs) => {
  const store = getRateLimiter();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, resetAt: now + windowMs, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { ok: false, resetAt: entry.resetAt, remaining: 0 };
  }
  entry.count += 1;
  return { ok: true, resetAt: entry.resetAt, remaining: limit - entry.count };
};

export const enforceApiGuard = async (
  request,
  { cacheSeconds = 0, rateLimitPerMinute = 60 } = {}
) => {
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

  const ip = getClientIp(request);
  const rateKey = `${providedKey}:${ip}`;
  const result = isAllowed(rateKey, rateLimitPerMinute, 60 * 1000);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    });
  }

  return { ok: true, cacheSeconds };
};

export const withCacheHeaders = (headers, cacheSeconds) => {
  if (!cacheSeconds) return headers;
  headers["Cache-Control"] = `s-maxage=${cacheSeconds}`;
  return headers;
};
