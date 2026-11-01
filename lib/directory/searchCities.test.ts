import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { findCityByLabel, searchCities, type WorldCity } from "./searchCities.ts";

const allCities = JSON.parse(
  readFileSync(new URL("../../data/world-cities.json", import.meta.url), "utf8")
) as WorldCity[];

test("astana is Kazakhstan's capital in the SimpleMaps dump", () => {
  const hits = searchCities("astana", allCities);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].city_ascii, "Astana");
  assert.equal(hits[0].country, "Kazakhstan");
  assert.equal(hits[0].iso2, "KZ");
  const astana = allCities.find((city) => city.city_ascii === "Astana" && city.iso2 === "KZ");
  assert.ok(astana);
  assert.equal(typeof astana.lat, "number");
  assert.equal(typeof astana.lng, "number");
});

test("nur-sultan still finds Astana via admin name", () => {
  const hits = searchCities("nur-sultan", allCities);
  assert.ok(hits.some((city) => city.city_ascii === "Astana" && city.country === "Kazakhstan"));
});

test("findCityByLabel returns Astana coordinates", () => {
  const city = findCityByLabel("Astana, Nur-Sultan, Kazakhstan", allCities);
  assert.ok(city);
  assert.equal(city.iso2, "KZ");
  assert.equal(typeof city.lat, "number");
  assert.equal(typeof city.lng, "number");
});

test("city_alt names are searchable", () => {
  const hits = searchCities("oldname", [
    {
      city: "Newname",
      city_ascii: "Newname",
      admin_name: "Region",
      country: "Country",
      iso2: "CC",
      city_alt: "Oldname|Other",
    },
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].city_ascii, "Newname");
});
