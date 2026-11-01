export const PROFILE_SUFFIX_RE = /^(?<base>[a-z0-9_]+)-(?<id>\d+)(?:z(?<n>\d+))?$/;

export function preferredSuffixSlug(name: string, id: number): string {
  return `${name}-${id}`;
}

export function allocateSuffixSlug(name: string, id: number, taken: Set<string>): string {
  const preferred = preferredSuffixSlug(name, id);
  if (!taken.has(preferred)) return preferred;
  let n = 2;
  while (taken.has(`${name}-${id}z${n}`)) n += 1;
  return `${name}-${id}z${n}`;
}

export function parseProfileSuffixSlug(slug: string): { base: string; id: number } | null {
  const match = slug.match(PROFILE_SUFFIX_RE);
  if (!match?.groups?.base || !match.groups.id) return null;
  return { base: match.groups.base, id: Number.parseInt(match.groups.id, 10) };
}

export function holdsCanonicalSlug(
  profile: { slug?: string | null; address_verified?: boolean | null; zns_active?: boolean | null },
  name: string
): boolean {
  if (profile.slug) return profile.slug === name;
  if (profile.zns_active) return true;
  return profile.address_verified === true;
}
