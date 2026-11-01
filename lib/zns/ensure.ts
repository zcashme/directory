import "server-only";

import {
  resolveZnsName,
  ZnsUnavailableError,
  type ZnsRegistration,
} from "@/lib/zns/client";
import { applyZnsRegistration, deactivateZnsName, namespaceContains } from "@/lib/zns/applyBinding";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";

export type ZnsResolutionStatus = "ok" | "unregistered" | "unavailable";

export interface EnsureZnsNameResult {
  name: string;
  registration: ZnsRegistration | null;
  resolution: ZnsResolutionStatus;
  boundId: number | null;
}

export async function ensureZnsName(rawName: string): Promise<EnsureZnsNameResult> {
  const name = normalizeZnsName(rawName);
  if (!isValidZnsName(name)) {
    return { name, registration: null, resolution: "unregistered", boundId: null };
  }

  try {
    const registration = await resolveZnsName(name);
    if (registration?.address) {
      try {
        const applied = await applyZnsRegistration(registration);
        return {
          name,
          registration,
          resolution: "ok",
          boundId: applied.boundId,
        };
      } catch (error) {
        console.error(`Failed to bind ZNS name ${name}`, error);
        return {
          name,
          registration,
          resolution: "ok",
          boundId: null,
        };
      }
    }

    const reserved = await namespaceContains(name);
    const deactivated = await deactivateZnsName(name);
    return {
      name,
      registration: null,
      resolution: reserved || deactivated.deactivated ? "unregistered" : "unregistered",
      boundId: deactivated.boundId,
    };
  } catch (error) {
    if (error instanceof ZnsUnavailableError) {
      return { name, registration: null, resolution: "unavailable", boundId: null };
    }
    throw error;
  }
}
