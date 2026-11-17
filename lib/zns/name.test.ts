import assert from "node:assert/strict";
import test from "node:test";
import { formatZnsZecLabel, znsClaimHref } from "./name.ts";

test("formatZnsZecLabel appends .zec to a normalized name", () => {
  assert.equal(formatZnsZecLabel("Alice.zcash"), "alice.zec");
  assert.equal(formatZnsZecLabel("zechariah"), "zechariah.zec");
  assert.equal(formatZnsZecLabel("already.zec"), "already.zec");
  assert.equal(formatZnsZecLabel(""), "");
});

test("znsClaimHref points at zcashnames claim with the profile address", () => {
  assert.equal(
    znsClaimHref("Alice.zcash", "u1abc"),
    "https://zcashnames.com/claim/alice?address=u1abc"
  );
  assert.equal(znsClaimHref("bob", "  "), "https://zcashnames.com/claim/bob");
});
