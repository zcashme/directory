import assert from "node:assert/strict";
import test from "node:test";
import { classifyUnboundMatch, classifyZnsMatch, classifyZnsRelease, shouldApplyAddress } from "./match.ts";
import { allocateSuffixSlug } from "./slugs.ts";
import { normalizeZnsName, isValidZnsName, znsNamesMatch } from "./name.ts";

const registration = {
  name: "alice",
  address: "u1aaa",
  txid: "tx-1",
  height: 10,
  lastAction: "claim" as const,
  expiresAt: null,
};

test("normalizeZnsName strips suffix and does not smash underscores", () => {
  assert.equal(normalizeZnsName("Alice.zcash"), "alice");
  assert.equal(normalizeZnsName("alice_bob"), "alice_bob");
  assert.equal(isValidZnsName("alice_bob"), false);
  assert.equal(znsNamesMatch("alice_bob", "alicebob"), false);
  assert.equal(znsNamesMatch("Alice.zec", "alice"), true);
});

test("scenario A upgrades verified same-address profile", () => {
  const decision = classifyZnsMatch(registration, [{
    id: 5,
    name: "alice",
    address: "U1AAA",
    address_verified: true,
    slug: "alice",
    zns_name: null,
    zns_active: false,
    zns_claim_txid: null,
    zns_address_height: null,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "upgrade", profileId: 5 });
});

test("scenario B creates when no same-name profile exists", () => {
  const decision = classifyUnboundMatch(registration, []);
  assert.deepEqual(decision, { kind: "create" });
});

test("scenario C displaces verified different-address occupant", () => {
  const decision = classifyZnsMatch(registration, [{
    id: 7,
    name: "alice",
    address: "u1bbb",
    address_verified: true,
    slug: "alice",
    zns_name: null,
    zns_active: false,
    zns_claim_txid: null,
    zns_address_height: null,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "displace_and_create", displaceId: 7 });
});

test("scenario D displaces unverified same-address profile", () => {
  const decision = classifyZnsMatch(registration, [{
    id: 9,
    name: "alice",
    address: "u1aaa",
    address_verified: false,
    slug: "alice-9",
    zns_name: null,
    zns_active: false,
    zns_claim_txid: null,
    zns_address_height: null,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "displace_and_create", displaceId: 9 });
});

test("update action on an active binding is an address sync even with a new txid", () => {
  const decision = classifyZnsMatch({
    ...registration,
    address: "u1zzz",
    txid: "tx-update",
    height: 15,
    lastAction: "update",
  }, [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: true,
    slug: "alice",
    zns_name: "alice",
    zns_active: true,
    zns_claim_txid: "tx-1",
    zns_address_height: 10,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "sync", boundId: 5 });
});

test("same claim is an address sync", () => {
  const decision = classifyZnsMatch(registration, [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: true,
    slug: "alice",
    zns_name: "alice",
    zns_active: true,
    zns_claim_txid: "tx-1",
    zns_address_height: 10,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "sync", boundId: 5 });
});

test("new claim same address reactivates the bound profile", () => {
  const decision = classifyZnsMatch({ ...registration, txid: "tx-2", height: 20 }, [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: true,
    slug: "alice",
    zns_name: "alice",
    zns_active: false,
    zns_claim_txid: "tx-1",
    zns_address_height: 10,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "reactivate", boundId: 5 });
});

test("new claim different address transfers away from previous bound profile", () => {
  const decision = classifyZnsMatch({ ...registration, address: "u1ccc", txid: "tx-2" }, [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: true,
    slug: "alice",
    zns_name: "alice",
    zns_active: true,
    zns_claim_txid: "tx-1",
    zns_address_height: 10,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.equal(decision.kind, "transfer");
  if (decision.kind === "transfer") {
    assert.equal(decision.previousBoundId, 5);
    assert.deepEqual(decision.next, { kind: "create" });
  }
});

test("release deactivates the active bound profile", () => {
  const decision = classifyZnsRelease("alice", [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: true,
    slug: "alice",
    zns_name: "alice",
    zns_active: true,
    zns_claim_txid: "tx-1",
    zns_address_height: 10,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "deactivate", boundId: 5 });
});

test("address height never moves backwards", () => {
  assert.equal(shouldApplyAddress(20, 10), false);
  assert.equal(shouldApplyAddress(10, 20), true);
  assert.equal(shouldApplyAddress(null, 1), true);
});

test("suffix allocator preserves zcasher id and uses zN fallback", () => {
  const taken = new Set(["alice-12"]);
  assert.equal(allocateSuffixSlug("alice", 12, taken), "alice-12z2");
  taken.add("alice-12z2");
  assert.equal(allocateSuffixSlug("alice", 12, taken), "alice-12z3");
});
