const BASE_URL = (process.env.ONECLICK_BASE_URL || "https://1click.chaindefuser.com").replace(/\/$/, "");
const API_KEY = process.env.ONECLICK_API_KEY || "";
const TIMEOUT_MS = Math.floor(Number(process.env.ONECLICK_TIMEOUT_SECONDS || "45") * 1000);

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
let TOKENS_CACHE = { at: 0, ttlMs: 300_000, data: null };

export async function oneclickTokens() {
  if (!API_KEY) throw new Error("ONECLICK_API_KEY is missing");

  const now = Date.now();
  if (TOKENS_CACHE.data && now - TOKENS_CACHE.at < TOKENS_CACHE.ttlMs) return TOKENS_CACHE.data;

  const r = await fetchWithTimeout(`${BASE_URL}/v0/tokens`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) throw new Error(`tokens failed: ${r.status} ${text}`);

  const data = JSON.parse(text);
  TOKENS_CACHE = { ...TOKENS_CACHE, at: now, data };
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
