export interface WorldCity {
  city: string;
  city_ascii: string;
  admin_name: string;
  country: string;
  iso2: string;
  lat?: number;
  lng?: number;
  id?: string;
  city_alt?: string;
  capital?: string;
  population?: number;
}

export interface City {
  city: string;
  city_ascii: string;
  admin_name: string;
  country: string;
  iso2: string;
}

export function cityDisplayLabel(city: Pick<WorldCity, "city" | "city_ascii" | "admin_name" | "country">): string {
  const name = city.city_ascii || city.city;
  if (!city.admin_name) return `${name}, ${city.country}`;
  return `${name}, ${city.admin_name}, ${city.country}`;
}

export function findCityByLabel(label: string, cities: WorldCity[]): WorldCity | null {
  const needle = label.trim().toLowerCase();
  if (!needle) return null;
  for (const city of cities) {
    if (cityDisplayLabel(city).toLowerCase() === needle) return city;
  }
  return null;
}

function toPublicCity(city: WorldCity): City {
  return {
    city: city.city,
    city_ascii: city.city_ascii,
    admin_name: city.admin_name,
    country: city.country,
    iso2: city.iso2,
  };
}

function matchesQuery(city: WorldCity, query: string): boolean {
  if ((city.city ?? "").toLowerCase().includes(query)) return true;
  if ((city.city_ascii ?? "").toLowerCase().includes(query)) return true;
  if ((city.admin_name ?? "").toLowerCase().includes(query)) return true;
  if ((city.country ?? "").toLowerCase().includes(query)) return true;
  if (cityDisplayLabel(city).toLowerCase().includes(query)) return true;
  if (city.city_alt) {
    for (const alt of city.city_alt.split("|")) {
      if (alt.trim().toLowerCase().includes(query)) return true;
    }
  }
  return false;
}

function rankCity(city: WorldCity, query: string): number {
  const ascii = (city.city_ascii ?? "").toLowerCase();
  const name = (city.city ?? "").toLowerCase();
  let rank = 3;
  if (ascii === query || name === query) rank = 0;
  else if (ascii.startsWith(query) || name.startsWith(query)) rank = 1;
  else if (ascii.includes(query) || name.includes(query)) rank = 2;
  if (city.capital === "primary") rank -= 0.4;
  else if (city.capital === "admin") rank -= 0.1;
  return rank;
}

export function searchCities(query: string, cities: WorldCity[], limit = 20): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored: Array<{ city: WorldCity; rank: number }> = [];
  for (const city of cities) {
    if (!matchesQuery(city, q)) continue;
    scored.push({ city, rank: rankCity(city, q) });
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.city.population ?? 0) - (a.city.population ?? 0);
  });

  return scored.slice(0, limit).map((row) => toPublicCity(row.city));
}
