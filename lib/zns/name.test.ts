import assert from "node:assert/strict";
import test from "node:test";
import { formatZnsZecLabel } from "./name.ts";

test("formatZnsZecLabel appends .zec to a normalized name", () => {
  assert.equal(formatZnsZecLabel("Alice.zcash"), "alice.zec");
  assert.equal(formatZnsZecLabel("zechariah"), "zechariah.zec");
  assert.equal(formatZnsZecLabel("already.zec"), "already.zec");
  assert.equal(formatZnsZecLabel(""), "");
});
