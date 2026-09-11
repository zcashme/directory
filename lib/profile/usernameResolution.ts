import "server-only";

import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import type { Profile } from "@/lib/profile/types";
import { addressesMatch, isValidZnsName, normalizeZnsName } from "@/lib/zns/name";
import { resolveZnsName, type ZnsRegistration } from "@/lib/zns/client";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { normalizeUsernameForCompare } from "@/lib/profile/usernamePolicy";

export type SlugResolution =
  | { kind: "profile"; profile: Profile; znsBound: boolean }
  | { kind: "zns-identity"; name: string; registration: ZnsRegistration }
  | { kind: "not-found" };

const SUFFIX_RE = /^(?<base>[a-z0-9_]+)-(?<id>\d+)$/;

export function isZnsBoundProfile(
  profile: Partial<Profile> | null | undefined,
  registration: ZnsRegistration | null | undefined
): boolean {
  if (!profile?.name || !profile.address || !registration) return false;
  return (
    normalizeZnsName(profile.name) === normalizeZnsName(registration.name)
    && addressesMatch(profile.address, registration.address)
  );
}

export function buildCanonicalSlug(
  profile: Partial<Profile> | null | undefined,
  znsBound = false
): string {
  if (!profile?.name) return "";
  const base = normalizeUsernameForCompare(profile.name) || normalizeZnsName(profile.name);
  if (!base) return "";
  if (znsBound) return base;
  return typeof profile.id === "number" ? `${base}-${profile.id}` : base;
}

async function findMatchingBoundProfile(
  name: string,
  address: string
): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .ilike("name", name)
    .limit(50);

  const matches = (data ?? []).filter((row: Profile) =>
    normalizeZnsName(row.name ?? "") === normalizeZnsName(name)
    && addressesMatch(row.address, address)
  );

  if (!matches.length) return null;
  return matches.slice().sort((a: Profile, b: Profile) => (a.id ?? 0) - (b.id ?? 0))[0];
}

export async function resolveProfileSlug(rawSlug: string): Promise<SlugResolution> {
  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug) return { kind: "not-found" };

  const suffixed = slug.match(SUFFIX_RE);
  if (suffixed?.groups?.id && suffixed.groups.base) {
    const profile = await fetchProfileForSlug(slug);
    if (!profile) return { kind: "not-found" };
    const registration = await resolveZnsName(profile.name);
    return {
      kind: "profile",
      profile,
      znsBound: isZnsBoundProfile(profile, registration),
    };
  }

  const znsName = normalizeZnsName(slug);
  const registration = isValidZnsName(znsName) ? await resolveZnsName(znsName) : null;

  if (registration?.address) {
    const bound = await findMatchingBoundProfile(registration.name, registration.address);
    if (bound) {
      const profile = await fetchProfileForSlug(
        typeof bound.id === "number"
          ? `${normalizeUsernameForCompare(bound.name)}-${bound.id}`
          : slug
      );
      if (profile) {
        return { kind: "profile", profile, znsBound: true };
      }
      return { kind: "profile", profile: bound, znsBound: true };
    }
    return {
      kind: "zns-identity",
      name: registration.name,
      registration,
    };
  }

  const profile = await fetchProfileForSlug(slug);
  if (!profile) return { kind: "not-found" };
  return { kind: "profile", profile, znsBound: false };
}
