const BASE_URL = "https://1click.chaindefuser.com".replace(/\/$/, "");
const API_KEY = process.env.ONECLICK_API_KEY;
const TIMEOUT_MS = 45 * 1000; // 45 seconds

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

export async function oneclickTokens() {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const r = await fetchWithTimeout(`${BASE_URL}/v0/tokens`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) {
    // Try to extract the error message from the response
    try {
      const errorData = JSON.parse(text);
      const serverError = errorData?.error || errorData?.message || errorData?.detail;
      if (serverError) {
        return { error: serverError };
      }
    } catch {
      // If we can't parse the error response, fall through to generic message
    }
    return { error: "Failed to load tokens from API" };
  }

  try {
    const allTokens = JSON.parse(text);
    // Keep ZEC plus BTC, ETH, USDC, USDT, SOL across all blockchain variants
    const allowedSymbols = new Set(["ZEC", "BTC", "ETH", "USDC", "USDT", "SOL"]);
    const filtered = allTokens.filter((t) => allowedSymbols.has(t.symbol));

    // Filter to mainnet only (remove testnet)
    const mainnetOnly = filtered.filter(
      (token) =>
        token.blockchain &&
        !token.blockchain.toLowerCase().includes("testnet") &&
        !token.blockchain.toLowerCase().includes("test")
    );

    return mainnetOnly;
  } catch {
    return { error: "Invalid response from tokens API" };
  }
}

export async function oneclickQuote(payload) {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const r = await fetchWithTimeout(`${BASE_URL}/v0/quote`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const text = await r.text();

  if (!r.ok) {
    // Try to extract the error message from the response
    try {
      const errorData = JSON.parse(text);
      const serverError = errorData?.error || errorData?.message || errorData?.detail;
      if (serverError) {
        return { error: serverError };
      }
    } catch {
      // If we can't parse the error response, fall through to generic message
    }
    return { error: "Could not get quote. Check your input and try again." };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid response from quote API" };
  }
}

export async function oneclickStatus(params) {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const qs = new URLSearchParams(params);
  const r = await fetchWithTimeout(`${BASE_URL}/v0/status?${qs.toString()}`, { headers: headers() });
  const text = await r.text();

  if (r.status === 404) {
    return { status: "PENDING_DEPOSIT", message: "Deposit address not found yet" };
  }

  if (!r.ok) {
    // Try to extract the error message from the response
    try {
      const errorData = JSON.parse(text);
      const serverError = errorData?.error || errorData?.message || errorData?.detail;
      if (serverError) {
        return { error: serverError };
      }
    } catch {
      // If we can't parse the error response, fall through to generic message
    }
    return { error: "Could not check swap status. Try again in a moment." };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid response from status API" };
  }
}

export async function oneclickDepositSubmit({ txHash, depositAddress }) {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const payload = {
    txHash,
    depositAddress,
  };

  const r = await fetchWithTimeout(`${BASE_URL}/v0/deposit/submit`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const text = await r.text();

  if (!r.ok) {
    // Try to extract the error message from the response
    try {
      const errorData = JSON.parse(text);
      const serverError = errorData?.error || errorData?.message || errorData?.detail;
      if (serverError) {
        return { error: serverError };
      }
    } catch {
      // If we can't parse the error response, fall through to generic message
    }
    return { error: "Could not submit transaction hash. Please try again." };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid response from deposit submit API" };
  }
}
