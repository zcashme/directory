import "server-only";

import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";

export type ZnsNetwork = "testnet" | "mainnet";

export interface ZnsRegistration {
  name: string;
  address: string;
  txid?: string | null;
  height?: number | null;
}

export interface ResolveZnsNameOptions {
  signal?: AbortSignal;
  cache?: RequestCache;
}

const NETWORK_URLS: Record<ZnsNetwork, string> = {
  testnet: "https://light.zcash.me/zns-testnet",
  mainnet: "https://light.zcash.me/zns-mainnet",
};

function resolveNetwork(): ZnsNetwork {
  const raw = (process.env.ZNS_NETWORK ?? "testnet").trim().toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

function resolveRpcUrl(network: ZnsNetwork): string {
  if (network === "mainnet") {
    return process.env.ZNS_MAINNET_RPC_URL?.trim() || NETWORK_URLS.mainnet;
  }
  return process.env.ZNS_TESTNET_RPC_URL?.trim() || NETWORK_URLS.testnet;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeRegistration(raw: unknown): ZnsRegistration | null {
  const record = asRecord(raw);
  if (!record) return null;
  const fromList = Array.isArray(record.registrations) ? asRecord(record.registrations[0]) : null;
  const nested = asRecord(record.registration) ?? fromList ?? record;
  if (!nested) return null;
  const name = pickString(nested, "name");
  const address = pickString(nested, "address");
  if (!name || !address) return null;
  return {
    name,
    address,
    txid: pickString(nested, "txid"),
    height: typeof nested.height === "number" ? nested.height : null,
  };
}

export async function resolveZnsName(
  rawName: string,
  options: ResolveZnsNameOptions = {}
): Promise<ZnsRegistration | null> {
  const name = normalizeZnsName(rawName);
  if (!isValidZnsName(name)) return null;

  const network = resolveNetwork();
  const url = resolveRpcUrl(network);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "resolve",
        params: { query: name },
      }),
      cache: options.cache ?? "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: unknown; error?: { message?: string } };
    if (payload?.error) return null;
    return normalizeRegistration(payload?.result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}
