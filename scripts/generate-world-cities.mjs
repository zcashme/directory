/**
 * Convert SimpleMaps World Cities Basic CSV into a compact JSON used by
 * city search. Download the Basic zip from
 * https://simplemaps.com/data/world-cities then:
 *
 *   node scripts/generate-world-cities.mjs path/to/worldcities.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = resolve(ROOT, "data/world-cities.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function compactCity(record) {
  const city = (record.city ?? "").trim();
  const city_ascii = (record.city_ascii ?? "").trim() || city;
  if (!city && !city_ascii) return null;

  const out = {
    city,
    city_ascii,
    admin_name: (record.admin_name ?? "").trim(),
    country: (record.country ?? "").trim(),
    iso2: (record.iso2 ?? "").trim(),
  };
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    out.lat = lat;
    out.lng = lng;
  }
  const id = (record.id ?? "").trim();
  if (id) out.id = id;
  const city_alt = (record.city_alt ?? "").trim();
  if (city_alt) out.city_alt = city_alt;
  const capital = (record.capital ?? "").trim();
  if (capital) out.capital = capital;
  const population = Number(record.population);
  if (Number.isFinite(population) && population > 0) out.population = population;
  return out;
}

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/generate-world-cities.mjs path/to/worldcities.csv");
  process.exit(1);
}

const csvPath = resolve(source);
const rows = parseCsv(readFileSync(csvPath, "utf8"));
if (rows.length < 2) {
  console.error("CSV had no data rows");
  process.exit(1);
}

const headers = rows[0].map((h) => h.trim());
const cities = [];
for (const values of rows.slice(1)) {
  if (values.length === 1 && values[0] === "") continue;
  const record = {};
  headers.forEach((header, index) => {
    record[header] = values[index] ?? "";
  });
  const city = compactCity(record);
  if (city) cities.push(city);
}

mkdirSync(dirname(DEFAULT_OUT), { recursive: true });
writeFileSync(DEFAULT_OUT, `${JSON.stringify(cities)}\n`);
console.log(`Wrote ${cities.length} cities to ${DEFAULT_OUT}`);
