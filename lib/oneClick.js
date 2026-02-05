const BASE_URL = "https://1click.chaindefuser.com".replace(/\/$/, "");
const API_KEY = process.env.ONECLICK_API_KEY || "";
const TIMEOUT_MS = 45 * 1000; // 45 seconds

if (!API_KEY) {
  // Don't throw at import time in Next. We'll throw inside handlers.
}

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

// Very small in-memory cache (works fine in dev; in prod serverless it’s best-effort)
// Note: Caching is now handled at the route level using Next.js unstable_cache
// This ensures proper cache persistence across serverless invocations on Vercel
export async function oneclickTokens() {
  if (!API_KEY) throw new Error("ONECLICK_API_KEY is missing");

  const r = await fetchWithTimeout(`${BASE_URL}/v0/tokens`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) throw new Error(`tokens failed: ${r.status} ${text}`);

  const data = JSON.parse(text);
  return data;
}

export async function oneclickQuote(payload) {
  if (!API_KEY) throw new Error("ONECLICK_API_KEY is missing");

  const r = await fetchWithTimeout(`${BASE_URL}/v0/quote`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`quote failed: ${r.status} ${text}`);
  return JSON.parse(text);
}

export async function oneclickStatus(params) {
  if (!API_KEY) throw new Error("ONECLICK_API_KEY is missing");

  const qs = new URLSearchParams(params);
  const r = await fetchWithTimeout(`${BASE_URL}/v0/status?${qs.toString()}`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) throw new Error(`status failed: ${r.status} ${text}`);
  return JSON.parse(text);
}
