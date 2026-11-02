import assert from "node:assert/strict";
import test from "node:test";
import { getLinkAuthenticatedLabel } from "./profileUtils.ts";

test("getLinkAuthenticatedLabel uses month and year", () => {
  assert.equal(getLinkAuthenticatedLabel("2025-10-23T10:58:54.721Z"), "Authenticated Oct 2025");
});

test("getLinkAuthenticatedLabel falls back without a timestamp", () => {
  assert.equal(getLinkAuthenticatedLabel(null), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel(undefined), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel(""), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel("not-a-date"), "Authenticated");
});
