import "server-only";

import { fetchProfileForId, fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import type { Profile } from "@/lib/profile/types";
import { isZnsActiveProfile } from "@/lib/profile/profileUtils";
import { isValidZnsName, normalizeZnsName, znsNamesMatch } from "@/lib/zns/name";
import { ensureZnsName, type ZnsResolutionStatus } from "@/lib/zns/ensure";
import { namespaceContains } from "@/lib/zns/applyBinding";
import { PROFILE_SUFFIX_RE } from "@/lib/zns/slugs";
import type { ZnsRegistration } from "@/lib/zns/client";

export type SlugResolution =
  | { kind: "profile"; profile: Profile; znsBound: boolean }
  | { kind: "not-found" };

export function isZnsBoundProfile(
  profile: Partial<Profile> | null | undefined,
  registration?: ZnsRegistration | null | undefined
): boolean {
  if (isZnsActiveProfile(profile)) return true;
  if (!profile?.name || !registration) return false;
  return znsNamesMatch(profile.name, registration.name);
}

export function buildCanonicalSlug(
  profile: Partial<Profile> | null | undefined,
  znsBound = false
): string {
  if (profile?.slug) return profile.slug;
  if (!profile?.name) return "";
  const base = normalizeZnsName(profile.name) || profile.name.trim().toLowerCase();
  if (!base) return "";
  if (znsBound || isZnsActiveProfile(profile) || profile.address_verified) return base;
  return typeof profile.id === "number" ? `${base}-${profile.id}` : base;
}

function withResolution(
  profile: Profile,
  resolution: ZnsResolutionStatus,
  liveAddress?: string | null
): Profile {
  const next: Profile = { ...profile, zns_resolution: resolution };
  if (resolution === "ok" && liveAddress) {
    next.address = liveAddress;
  }
  if (isZnsActiveProfile(profile) && resolution === "unavailable") {
    next.address = "";
  }
  return next;
}

export async function resolveProfileSlug(rawSlug: string): Promise<SlugResolution> {
  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug) return { kind: "not-found" };

  const suffixed = slug.match(PROFILE_SUFFIX_RE);
  if (suffixed?.groups?.id && suffixed.groups.base) {
    const profile = await fetchProfileForSlug(slug);
    if (!profile) return { kind: "not-found" };
    return {
      kind: "profile",
      profile: withResolution(profile, isZnsActiveProfile(profile) ? "ok" : "unregistered"),
      znsBound: isZnsActiveProfile(profile),
    };
  }

  const znsName = normalizeZnsName(slug);
  if (isValidZnsName(znsName)) {
    let ensured: Awaited<ReturnType<typeof ensureZnsName>> | null = null;
    try {
      ensured = await ensureZnsName(znsName);
    } catch {
      ensured = null;
    }

    if (ensured?.resolution === "ok" && ensured.registration) {
      const profile = ensured.boundId != null ? await fetchProfileForId(ensured.boundId) : null;
      if (profile) {
        return {
          kind: "profile",
          profile: withResolution(profile, "ok", ensured.registration.address),
          znsBound: isZnsActiveProfile(profile) || znsNamesMatch(profile.zns_name, ensured.registration.name),
        };
      }
    }

    if (ensured?.resolution === "unavailable") {
      const profile = await fetchProfileForSlug(znsName);
      if (profile) {
        return {
          kind: "profile",
          profile: withResolution(profile, isZnsActiveProfile(profile) ? "unavailable" : "unregistered"),
          znsBound: isZnsActiveProfile(profile),
        };
      }
      return { kind: "not-found" };
    }

    const profile = await fetchProfileForSlug(znsName);
    if (profile) {
      return {
        kind: "profile",
        profile: withResolution(profile, isZnsActiveProfile(profile) ? "ok" : "unregistered"),
        znsBound: isZnsActiveProfile(profile),
      };
    }
    if (ensured?.resolution === "ok") return { kind: "not-found" };
    const reserved = await namespaceContains(znsName).catch(() => false);
    if (reserved) return { kind: "not-found" };
  }

  const profile = await fetchProfileForSlug(slug);
  if (!profile) return { kind: "not-found" };
  return {
    kind: "profile",
    profile: withResolution(profile, isZnsActiveProfile(profile) ? "ok" : "unregistered"),
    znsBound: isZnsActiveProfile(profile),
  };
}
