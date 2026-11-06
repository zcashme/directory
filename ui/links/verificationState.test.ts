import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedCurrentVerificationState,
  isSocialLinkVerified,
} from "./verificationState.ts";

test("only an explicit true is an authenticated social link", () => {
  assert.equal(isSocialLinkVerified(true), true);
  assert.equal(isSocialLinkVerified(false), false);
  assert.equal(isSocialLinkVerified(null), false);
  assert.equal(isSocialLinkVerified(undefined), false);
});

test("guarded verification updates require the expected prior state", () => {
  assert.equal(expectedCurrentVerificationState("verify"), false);
  assert.equal(expectedCurrentVerificationState("reverify"), true);
  assert.equal(expectedCurrentVerificationState("unverify"), true);
});
