import { addressesMatch, znsNamesMatch } from "@/lib/zns/name";
import { holdsCanonicalSlug } from "@/lib/zns/slugs";
import type { ZnsLastAction } from "@/lib/zns/client";

export interface MatchCandidate {
  id: number;
  name: string;
  address: string | null;
  address_verified: boolean;
  slug: string | null;
  zns_name: string | null;
  zns_active: boolean;
  zns_claim_txid: string | null;
  zns_address_height: number | null;
  is_maxi: boolean;
  maxi_source: "paid" | "zns" | null;
}

export interface MatchRegistration {
  name: string;
  address: string;
  txid: string | null;
  height: number | null;
  lastAction: ZnsLastAction | null;
  expiresAt: string | null;
}

export type UnboundDecision =
  | { kind: "upgrade"; profileId: number }
  | { kind: "create" }
  | { kind: "displace_and_create"; displaceId: number }
  | { kind: "displace_and_upgrade"; displaceId: number; profileId: number };

export type MatchDecision =
  | { kind: "sync"; boundId: number }
  | { kind: "reactivate"; boundId: number }
  | { kind: "new_period_same_owner"; boundId: number }
  | { kind: "transfer"; previousBoundId: number; next: UnboundDecision }
  | UnboundDecision;

export type ReleaseDecision =
  | { kind: "deactivate"; boundId: number }
  | { kind: "none" };

function isBoundToName(profile: MatchCandidate, name: string): boolean {
  return Boolean(profile.zns_name && znsNamesMatch(profile.zns_name, name));
}

function occupantOfCanonicalUrl(profiles: MatchCandidate[], name: string): MatchCandidate | null {
  return profiles
    .filter((profile) => holdsCanonicalSlug(profile, name) || profile.slug === name)
    .slice()
    .sort((a, b) => a.id - b.id)[0] ?? null;
}

function sameNameUnbound(profiles: MatchCandidate[], name: string, excludeId?: number): MatchCandidate[] {
  return profiles
    .filter((profile) => profile.id !== excludeId)
    .filter((profile) => znsNamesMatch(profile.name, name))
    .filter((profile) => !profile.zns_active)
    .slice()
    .sort((a, b) => a.id - b.id);
}

export function classifyUnboundMatch(
  registration: MatchRegistration,
  profiles: MatchCandidate[]
): UnboundDecision {
  const sameName = sameNameUnbound(profiles, registration.name);
  const sameNameSameAddress = sameName.find((profile) =>
    addressesMatch(profile.address, registration.address)
  ) ?? null;
  const occupant = occupantOfCanonicalUrl(profiles, registration.name);

  if (sameNameSameAddress) {
    if (occupant && occupant.id !== sameNameSameAddress.id) {
      return { kind: "displace_and_upgrade", displaceId: occupant.id, profileId: sameNameSameAddress.id };
    }
    return { kind: "upgrade", profileId: sameNameSameAddress.id };
  }

  if (occupant) {
    return { kind: "displace_and_create", displaceId: occupant.id };
  }

  return { kind: "create" };
}

export function classifyZnsMatch(
  registration: MatchRegistration,
  profiles: MatchCandidate[]
): MatchDecision {
  const bound = profiles
    .filter((profile) => isBoundToName(profile, registration.name))
    .slice()
    .sort((a, b) => Number(b.zns_active) - Number(a.zns_active) || a.id - b.id)[0] ?? null;

  if (bound) {
    const sameClaim = Boolean(
      registration.txid
      && bound.zns_claim_txid
      && bound.zns_claim_txid === registration.txid
    );
    const isAddressUpdate = registration.lastAction === "update";
    if (sameClaim || (isAddressUpdate && bound.zns_active)) {
      return { kind: "sync", boundId: bound.id };
    }

    if (addressesMatch(bound.address, registration.address)) {
      return bound.zns_active
        ? { kind: "new_period_same_owner", boundId: bound.id }
        : { kind: "reactivate", boundId: bound.id };
    }

    return {
      kind: "transfer",
      previousBoundId: bound.id,
      next: classifyUnboundMatch(
        registration,
        profiles.filter((profile) => profile.id !== bound.id)
      ),
    };
  }

  return classifyUnboundMatch(registration, profiles);
}

export function classifyZnsRelease(name: string, profiles: MatchCandidate[]): ReleaseDecision {
  const bound = profiles.find((profile) => isBoundToName(profile, name) && profile.zns_active);
  if (!bound) return { kind: "none" };
  return { kind: "deactivate", boundId: bound.id };
}

export function shouldApplyAddress(
  currentHeight: number | null | undefined,
  incomingHeight: number | null | undefined
): boolean {
  if (incomingHeight == null) return currentHeight == null;
  if (currentHeight == null) return true;
  return incomingHeight > currentHeight;
}
