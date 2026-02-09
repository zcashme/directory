import type { Token } from "@/lib/swap/types";
import type { QuotePayload, QuoteResponse, SwapStatusData } from "@/lib/swap/types";
import type { FetchResult } from "@/lib/api/types";

const BASE_URL = "https://1click.chaindefuser.com".replace(/\/$/, "");
const API_KEY = process.env.ONECLICK_API_KEY;
const TIMEOUT_MS = 45 * 1000; // 45 seconds

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Extract error message from API response text
 * @returns Error message if found, null if response should be parsed as success
 */
function parseErrorResponse(text: string): string | null {
  try {
    const errorData = JSON.parse(text) as { error?: string; message?: string; detail?: string };
    return errorData?.error || errorData?.message || errorData?.detail || null;
  } catch {
    return null;
  }
}

export async function oneclickTokens(): Promise<FetchResult<Token[]>> {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const r = await fetchWithTimeout(`${BASE_URL}/v0/tokens`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) {
    const serverError = parseErrorResponse(text);
    return { error: serverError || "Failed to load tokens from API" };
  }

  try {
    const allTokens = JSON.parse(text) as Token[];
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

    // Filter out NEAR blockchain tokens and restrict ZEC to native chain
    const finalFiltered = mainnetOnly.filter((token) => {
      const blockchain = (token.blockchain || "").toLowerCase();
      const symbol = token.symbol || token.ticker || "";

      // Filter out NEAR blockchain tokens only (not bridged tokens)
      if (blockchain === "near" || blockchain === "near.mainnet" || blockchain.startsWith("near.")) {
        return false;
      }

      // Restrict ZEC to native chain only (no wrapped ZEC on other chains)
      if (symbol === "ZEC" && !blockchain.includes("zec")) {
        return false;
      }

      return true;
    });

    return finalFiltered;
  } catch {
    return { error: "Invalid response from tokens API" };
  }
}

export async function oneclickQuote(payload: QuotePayload): Promise<FetchResult<QuoteResponse>> {
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
    const serverError = parseErrorResponse(text);
    return { error: serverError || "Could not get quote. Check your input and try again." };
  }

  try {
    return JSON.parse(text) as QuoteResponse;
  } catch {
    return { error: "Invalid response from quote API" };
  }
}

export async function oneclickStatus(params: Record<string, string>): Promise<FetchResult<SwapStatusData>> {
  if (!API_KEY) {
    return { error: "1Click API key not configured. Please contact support." };
  }

  const qs = new URLSearchParams(params);
  const r = await fetchWithTimeout(`${BASE_URL}/v0/status?${qs.toString()}`, { headers: headers() });
  const text = await r.text();

  if (!r.ok) {
    const serverError = parseErrorResponse(text);
    return { error: serverError || "Could not check swap status. Try again in a moment." };
  }

  try {
    return JSON.parse(text) as SwapStatusData;
  } catch {
    return { error: "Invalid response from status API" };
  }
}

interface DepositSubmitParams {
  txHash: string;
  depositAddress: string;
}

export async function oneclickDepositSubmit({ txHash, depositAddress }: DepositSubmitParams): Promise<FetchResult<unknown>> {
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
    const serverError = parseErrorResponse(text);
    return { error: serverError || "Could not submit transaction hash. Please try again." };
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: "Invalid response from deposit submit API" };
  }
}
