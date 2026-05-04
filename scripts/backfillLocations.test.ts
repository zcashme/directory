import * as assert from "node:assert/strict";

import {
  isProfileLocationIncomplete,
  resolveLocationMetadata,
} from "../lib/directory/locationBackfill";

function expectResolved(
  input: string,
  expected: { country: string; iso2: string; source?: string }
): void {
  const result = resolveLocationMetadata(input);
  assert.equal("country" in result, true, `Expected "${input}" to resolve.`);
  if (!("country" in result)) return;
  assert.equal(result.country, expected.country, `Unexpected country for "${input}".`);
  assert.equal(result.iso2, expected.iso2, `Unexpected iso2 for "${input}".`);
  if (expected.source) {
    assert.equal(result.source, expected.source, `Unexpected source for "${input}".`);
  }
}

function expectStatus(input: string, status: string): void {
  const result = resolveLocationMetadata(input);
  assert.equal("status" in result, true, `Expected "${input}" to remain unresolved.`);
  if (!("status" in result)) return;
  assert.equal(result.status, status, `Unexpected status for "${input}".`);
}

expectResolved("Johor Bahru", { country: "Malaysia", iso2: "MY" });
expectResolved("Johor Bahru, Johor, Malaysia", {
  country: "Malaysia",
  iso2: "MY",
});
expectResolved("Bangalore", {
  country: "India",
  iso2: "IN",
  source: "alias-query",
});
expectResolved("Caloocan City", {
  country: "Philippines",
  iso2: "PH",
  source: "alias-direct",
});
expectStatus("Washington", "ambiguous");
expectStatus("   ", "missing");

assert.equal(
  isProfileLocationIncomplete({
    id: 1,
    name: "katif",
    nearest_city_name: "Johor Bahru",
    country: null,
    iso2: null,
  }),
  true
);
assert.equal(
  isProfileLocationIncomplete({
    id: 2,
    name: "kev",
    nearest_city_name: "Johor Bahru",
    country: "Malaysia",
    iso2: "MY",
  }),
  false
);

console.log("backfillLocations tests passed");
