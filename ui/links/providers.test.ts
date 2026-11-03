import assert from "node:assert/strict";
import test from "node:test";
import { parseSocialLinkAuthIntent } from "./providers.ts";

test("parseSocialLinkAuthIntent accepts verify, reverify, and unverify", () => {
  assert.equal(parseSocialLinkAuthIntent("verify"), "verify");
  assert.equal(parseSocialLinkAuthIntent("reverify"), "reverify");
  assert.equal(parseSocialLinkAuthIntent("unverify"), "unverify");
});

test("parseSocialLinkAuthIntent rejects unknown values", () => {
  assert.equal(parseSocialLinkAuthIntent("authenticate"), null);
  assert.equal(parseSocialLinkAuthIntent(""), null);
  assert.equal(parseSocialLinkAuthIntent(undefined), null);
  assert.equal(parseSocialLinkAuthIntent(1), null);
});
