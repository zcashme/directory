import "server-only";

import { ZNS } from "zcashname-sdk";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";

export type ZnsNetwork = "testnet" | "mainnet";

export type ZnsLastAction = "claim" | "update" | "release";

export interface ZnsRegistration {
  name: string;
  address: string;
  txid: string | null;
  height: number | null;
  lastAction: ZnsLastAction | null;
  expiresAt: string | null;
}

export interface ZnsEvent {
  id: number;
  name: string;
  action: ZnsLastAction;
  txid: string;
  height: number;
  actionIndex: number;
  address: string;
  expiresAt: string | null;
}

export interface ResolveZnsNameOptions {
  signal?: AbortSignal;
}

export class ZnsUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ZnsUnavailableError";
    if (options && "cause" in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

const NETWORK_URLS: Record<ZnsNetwork, string> = {
  testnet: "https://light.zcash.me/zns-testnet",
  mainnet: "https://light.zcash.me/zns-mainnet",
};

export function resolveZnsNetwork(): ZnsNetwork {
  const raw = (process.env.ZNS_NETWORK ?? "mainnet").trim().toLowerCase();
  return raw === "testnet" ? "testnet" : "mainnet";
}

function resolveRpcUrl(network: ZnsNetwork): string {
  if (network === "mainnet") {
    return process.env.ZNS_MAINNET_RPC_URL?.trim() || NETWORK_URLS.mainnet;
  }
  return process.env.ZNS_TESTNET_RPC_URL?.trim() || NETWORK_URLS.testnet;
}

function getClient(): ZNS {
  const network = resolveZnsNetwork();
  return new ZNS({
    network,
    url: resolveRpcUrl(network),
    timeout: 8_000,
  });
}

function mapExpiresAt(value: string | null | undefined): string | null {
  if (!value || value === "none") return null;
  return value;
}

function mapRegistration(raw: {
  name: string;
  address: string;
  txid: string;
  height: number;
  lastAction: ZnsLastAction;
  expiresAt: string;
}): ZnsRegistration {
  return {
    name: normalizeZnsName(raw.name),
    address: raw.address,
    txid: raw.txid || null,
    height: Number.isFinite(raw.height) ? raw.height : null,
    lastAction: raw.lastAction ?? null,
    expiresAt: mapExpiresAt(raw.expiresAt),
  };
}

function asUnavailable(error: unknown, fallback: string): ZnsUnavailableError {
  if (error instanceof ZnsUnavailableError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new ZnsUnavailableError("ZNS resolver request aborted", { cause: error });
  }
  const message = error instanceof Error && error.message ? error.message : fallback;
  return new ZnsUnavailableError(message, { cause: error });
}

export async function verifyZnsResolver(signal?: AbortSignal): Promise<void> {
  try {
    await getClient().verify(signal);
  } catch (error) {
    throw asUnavailable(error, "ZNS resolver verification failed");
  }
}

export async function resolveZnsName(
  rawName: string,
  options: ResolveZnsNameOptions = {}
): Promise<ZnsRegistration | null> {
  const name = normalizeZnsName(rawName);
  if (!isValidZnsName(name)) return null;

  try {
    const raw = await getClient().resolveName(name, options.signal);
    if (!raw?.name || !raw.address) return null;
    return mapRegistration(raw);
  } catch (error) {
    throw asUnavailable(error, "ZNS resolver unavailable");
  }
}

export async function listZnsRegistrations(
  limit = 500,
  offset = 0,
  signal?: AbortSignal
): Promise<ZnsRegistration[]> {
  try {
    const page = await getClient().listAllRegistrations(limit, offset, signal);
    return page.map(mapRegistration);
  } catch (error) {
    throw asUnavailable(error, "ZNS list_names unavailable");
  }
}

export async function listZnsEvents(options: {
  sinceHeight?: number;
  name?: string;
  action?: ZnsLastAction;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
} = {}): Promise<ZnsEvent[]> {
  try {
    const result = await getClient().events({
      sinceHeight: options.sinceHeight,
      name: options.name,
      action: options.action,
      limit: options.limit,
      offset: options.offset,
    }, options.signal);
    return (result.events ?? []).map((event) => ({
      id: event.id,
      name: normalizeZnsName(event.name),
      action: event.action,
      txid: event.txid,
      height: event.height,
      actionIndex: event.actionIndex,
      address: event.address,
      expiresAt: mapExpiresAt(event.expiresAt),
    }));
  } catch (error) {
    throw asUnavailable(error, "ZNS events unavailable");
  }
}

export async function getZnsSyncedHeight(signal?: AbortSignal): Promise<number> {
  try {
    const status = await getClient().status(signal);
    return status.syncedHeight;
  } catch (error) {
    throw asUnavailable(error, "ZNS status unavailable");
  }
}
