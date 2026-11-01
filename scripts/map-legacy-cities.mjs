/**
 * Map world-cities-json@1.0.1 rows onto SimpleMaps Basic v1.91.4.
 *
 *   node scripts/map-legacy-cities.mjs path/to/old-cities.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEW_PATH = resolve(ROOT, "data/world-cities.json");
const MAP_PATH = resolve(ROOT, "data/world-cities-legacy-map.json");
const SQL_PATH = resolve(ROOT, "database/20261101_remap_cities.sql");
const UNMATCHED_PATH = resolve(ROOT, "data/world-cities-legacy-unmatched.json");
const MAX_KM = 25;

function displayLabel(city) {
  const name = city.city_ascii || city.city || "";
  if (!city.admin_name) return [name, city.country].filter(Boolean).join(", ");
  return [name, city.admin_name, city.country].filter(Boolean).join(", ");
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function asPoint(city) {
  const lat = Number(city.lat);
  const lng = Number(city.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const oldPath = process.argv[2];
if (!oldPath) {
  console.error("Usage: node scripts/map-legacy-cities.mjs path/to/old-cities.json");
  process.exit(1);
}

const oldCities = JSON.parse(readFileSync(resolve(oldPath), "utf8"));
const newCities = JSON.parse(readFileSync(NEW_PATH, "utf8"));

const byId = new Map();
const byIsoAscii = new Map();
const byIso = new Map();
for (const city of newCities) {
  if (city.id) byId.set(String(city.id), city);
  const key = `${(city.iso2 || "").toUpperCase()}|${(city.city_ascii || city.city || "").toLowerCase()}`;
  if (!byIsoAscii.has(key)) byIsoAscii.set(key, []);
  byIsoAscii.get(key).push(city);
  const iso = (city.iso2 || "").toUpperCase();
  if (!byIso.has(iso)) byIso.set(iso, []);
  byIso.get(iso).push(city);
}

function pickClosest(candidates, origin) {
  if (!origin || candidates.length === 0) return candidates[0] ?? null;
  let best = null;
  let bestKm = Infinity;
  for (const candidate of candidates) {
    const point = asPoint(candidate);
    if (!point) continue;
    const km = haversineKm(origin, point);
    if (km < bestKm) {
      best = candidate;
      bestKm = km;
    }
  }
  if (best && bestKm <= MAX_KM) return best;
  return origin && candidates.length === 1 ? candidates[0] : bestKm <= MAX_KM ? best : null;
}

function matchOld(oldCity) {
  const origin = asPoint(oldCity);
  if (oldCity.id && byId.has(String(oldCity.id))) {
    return { city: byId.get(String(oldCity.id)), via: "id" };
  }
  const asciiKey = `${(oldCity.iso2 || "").toUpperCase()}|${(oldCity.city_ascii || oldCity.city || "").toLowerCase()}`;
  const asciiHits = byIsoAscii.get(asciiKey) ?? [];
  const asciiMatch = pickClosest(asciiHits, origin);
  if (asciiMatch) return { city: asciiMatch, via: "iso2+city_ascii" };

  const countryCities = byIso.get((oldCity.iso2 || "").toUpperCase()) ?? [];
  const near = pickClosest(countryCities, origin);
  if (near && origin) {
    const km = asPoint(near) ? haversineKm(origin, asPoint(near)) : Infinity;
    if (km <= MAX_KM) return { city: near, via: "nearest" };
  }
  return null;
}

const unmatched = [];
const byOldLabel = new Map();
const viaRank = { id: 0, "iso2+city_ascii": 1, nearest: 2 };

for (const oldCity of oldCities) {
  const old_label = displayLabel(oldCity);
  const matched = matchOld(oldCity);
  if (!matched) {
    unmatched.push({
      old_label,
      city: oldCity.city_ascii || oldCity.city,
      iso2: oldCity.iso2 ?? null,
      id: oldCity.id ?? null,
    });
    continue;
  }
  const row = {
    old_label,
    new_label: displayLabel(matched.city),
    via: matched.via,
    id: matched.city.id ?? null,
    lat: matched.city.lat ?? null,
    lng: matched.city.lng ?? null,
    iso2: matched.city.iso2 ?? null,
    country: matched.city.country ?? null,
  };
  const existing = byOldLabel.get(old_label);
  if (!existing || (viaRank[row.via] ?? 9) < (viaRank[existing.via] ?? 9)) {
    byOldLabel.set(old_label, row);
  }
}

const mappings = [...byOldLabel.values()];
const uniqueChanged = mappings.filter((row) => row.old_label !== row.new_label);

mkdirSync(dirname(MAP_PATH), { recursive: true });
writeFileSync(MAP_PATH, `${JSON.stringify({
  source_old: "world-cities-json@1.0.1",
  source_new: "simplemaps-world-cities-basic-v1.91.4",
  matched: mappings.length,
  unmatched: unmatched.length,
  label_changes: uniqueChanged.length,
  mappings,
})}\n`);
writeFileSync(UNMATCHED_PATH, `${JSON.stringify(unmatched, null, 2)}\n`);

const sqlLines = [
  "-- Remap stored nearest_city_name strings from world-cities-json@1.0.1",
  "-- labels onto SimpleMaps Basic v1.91.4 display labels.",
  "-- Only rows whose saved label changed are updated.",
  "begin;",
  "",
  "update public.zcasher as profile",
  "set nearest_city_name = map.new_label",
  "from (values",
];
uniqueChanged.forEach((row, index) => {
  const comma = index === uniqueChanged.length - 1 ? "" : ",";
  sqlLines.push(`  (${sqlString(row.old_label)}, ${sqlString(row.new_label)})${comma}`);
});
sqlLines.push(") as map(old_label, new_label)");
sqlLines.push("where profile.nearest_city_name = map.old_label;");
sqlLines.push("");
sqlLines.push("commit;");
sqlLines.push("");
writeFileSync(SQL_PATH, `${sqlLines.join("\n")}\n`);

console.log(`matched ${mappings.length}/${oldCities.length}`);
console.log(`unmatched ${unmatched.length}`);
console.log(`label changes ${uniqueChanged.length}`);
console.log(`wrote ${MAP_PATH}`);
console.log(`wrote ${SQL_PATH}`);
