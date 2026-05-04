import * as cityTimezones from "city-timezones";

export interface BackfillProfileRow {
  id: number;
  name: string | null;
  nearest_city_name: string | null;
  country: string | null;
  iso2: string | null;
}

export interface BackfillReportItem {
  id: number;
  name: string | null;
  nearest_city_name: string | null;
  country: string | null;
  iso2: string | null;
}

export interface ResolvedLocation {
  country: string;
  iso2: string;
  source:
    | "unique"
    | "exact-city"
    | "exact-city-context"
    | "alias-query"
    | "alias-direct";
  matchedCity?: string;
  matchedProvince?: string;
}

export interface FailedLocationResolution {
  status: "missing" | "unresolved" | "ambiguous";
  reason: string;
}

export type LocationResolution = ResolvedLocation | FailedLocationResolution;

interface CityTimezoneRecord {
  city?: string;
  city_ascii?: string;
  country?: string;
  iso2?: string;
  province?: string;
}

interface QueryAliasResolution {
  kind: "query";
  query: string;
}

interface DirectAliasResolution {
  kind: "direct";
  country: string;
  iso2: string;
}

type AliasResolution = QueryAliasResolution | DirectAliasResolution;

const LOCATION_ALIASES: Record<string, AliasResolution> = {
  bangalore: { kind: "query", query: "Bengaluru" },
  "caloocan city": { kind: "direct", country: "Philippines", iso2: "PH" },
  "grass valley": {
    kind: "direct",
    country: "United States of America",
    iso2: "US",
  },
  "washington d c district of columbia united states of america": {
    kind: "direct",
    country: "United States of America",
    iso2: "US",
  },
};

export function isProfileLocationIncomplete(profile: BackfillProfileRow): boolean {
  const nearestCity = (profile.nearest_city_name ?? "").trim();
  if (!nearestCity) return false;
  const country = (profile.country ?? "").trim();
  const iso2 = (profile.iso2 ?? "").trim();
  return !country || !iso2;
}

export function normalizeLocationInput(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function parseLocationLabel(location: string): {
  full: string;
  primaryCity: string;
  province: string;
  country: string;
} {
  const full = normalizeLocationInput(location);
  const parts = full
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { full, primaryCity: "", province: "", country: "" };
  }

  if (parts.length === 1) {
    return { full, primaryCity: parts[0], province: "", country: "" };
  }

  return {
    full,
    primaryCity: parts[0],
    province: parts.slice(1, -1).join(" "),
    country: parts[parts.length - 1],
  };
}

function getAliasResolution(location: string): AliasResolution | null {
  const normalized = normalizeComparable(location);
  return LOCATION_ALIASES[normalized] ?? null;
}

function searchCityTimezones(query: string): CityTimezoneRecord[] {
  const results = cityTimezones.findFromCityStateProvince(query);
  return results as CityTimezoneRecord[];
}

function getExactCityMatches(
  results: CityTimezoneRecord[],
  primaryCity: string
): CityTimezoneRecord[] {
  const normalizedCity = normalizeComparable(primaryCity);
  return results.filter((result) => {
    const city = normalizeComparable(result.city ?? "");
    const ascii = normalizeComparable(result.city_ascii ?? result.city ?? "");
    return city === normalizedCity || ascii === normalizedCity;
  });
}

function getContextMatches(
  results: CityTimezoneRecord[],
  province: string,
  country: string
): CityTimezoneRecord[] {
  const normalizedProvince = normalizeComparable(province);
  const normalizedCountry = normalizeComparable(country);

  return results.filter((result) => {
    const provinceMatches = normalizedProvince
      ? normalizeComparable(result.province ?? "") === normalizedProvince
      : true;
    const countryMatches = normalizedCountry
      ? normalizeComparable(result.country ?? "") === normalizedCountry
      : true;
    return provinceMatches && countryMatches;
  });
}

function buildResolvedLocation(
  result: CityTimezoneRecord,
  source: ResolvedLocation["source"]
): ResolvedLocation {
  return {
    country: result.country ?? "",
    iso2: (result.iso2 ?? "").toUpperCase(),
    source,
    matchedCity: result.city ?? result.city_ascii ?? "",
    matchedProvince: result.province ?? "",
  };
}

function buildDirectAliasResolution(alias: DirectAliasResolution): ResolvedLocation {
  return {
    country: alias.country,
    iso2: alias.iso2.toUpperCase(),
    source: "alias-direct",
  };
}

export function resolveLocationMetadata(
  nearestCityName: string | null | undefined
): LocationResolution {
  const parsed = parseLocationLabel(nearestCityName ?? "");
  if (!parsed.full) {
    return { status: "missing", reason: "Location is empty." };
  }

  const directAlias = getAliasResolution(parsed.full);
  if (directAlias?.kind === "direct") {
    return buildDirectAliasResolution(directAlias);
  }

  const aliasForPrimaryCity = getAliasResolution(parsed.primaryCity);
  const query =
    aliasForPrimaryCity?.kind === "query" ? aliasForPrimaryCity.query : parsed.primaryCity;
  const results = searchCityTimezones(query);

  if (results.length === 0) {
    return {
      status: "unresolved",
      reason: `No location match found for "${parsed.full}".`,
    };
  }

  if (results.length === 1) {
    return buildResolvedLocation(
      results[0],
      aliasForPrimaryCity?.kind === "query" ? "alias-query" : "unique"
    );
  }

  const exactCityMatches = getExactCityMatches(results, query);
  if (exactCityMatches.length === 1) {
    return buildResolvedLocation(
      exactCityMatches[0],
      aliasForPrimaryCity?.kind === "query" ? "alias-query" : "exact-city"
    );
  }

  if (exactCityMatches.length > 1 && (parsed.province || parsed.country)) {
    const exactContextMatches = getContextMatches(
      exactCityMatches,
      parsed.province,
      parsed.country
    );
    if (exactContextMatches.length === 1) {
      return buildResolvedLocation(
        exactContextMatches[0],
        aliasForPrimaryCity?.kind === "query" ? "alias-query" : "exact-city-context"
      );
    }
  }

  return {
    status: "ambiguous",
    reason: `Multiple location matches found for "${parsed.full}".`,
  };
}

export interface BackfillResolutionBucket {
  updated: Array<BackfillReportItem & { resolved: ResolvedLocation }>;
  aliasResolved: Array<BackfillReportItem & { resolved: ResolvedLocation }>;
  unresolved: Array<BackfillReportItem & { reason: string }>;
  ambiguous: Array<BackfillReportItem & { reason: string }>;
}

export function bucketLocationResolutions(
  profiles: BackfillProfileRow[]
): BackfillResolutionBucket {
  const bucket: BackfillResolutionBucket = {
    updated: [],
    aliasResolved: [],
    unresolved: [],
    ambiguous: [],
  };

  for (const profile of profiles) {
    const resolution = resolveLocationMetadata(profile.nearest_city_name);
    const item: BackfillReportItem = {
      id: profile.id,
      name: profile.name,
      nearest_city_name: profile.nearest_city_name,
      country: profile.country,
      iso2: profile.iso2,
    };

    if ("country" in resolution) {
      const target =
        resolution.source === "alias-direct" || resolution.source === "alias-query"
          ? bucket.aliasResolved
          : bucket.updated;
      target.push({ ...item, resolved: resolution });
      continue;
    }

    if (resolution.status === "ambiguous") {
      bucket.ambiguous.push({ ...item, reason: resolution.reason });
      continue;
    }

    if (resolution.status === "unresolved") {
      bucket.unresolved.push({ ...item, reason: resolution.reason });
    }
  }

  return bucket;
}
