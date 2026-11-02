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

test("scenario D upgrades unverified same-address profile", () => {
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
  assert.deepEqual(decision, { kind: "upgrade", profileId: 9 });
});

test("same-UA different-name profile is left alone; a new ZNS row is created", () => {
  const decision = classifyZnsMatch({
    name: "55555",
    address: "u1zns",
    txid: "tx-1",
    height: 3533815,
    lastAction: "claim",
    expiresAt: null,
  }, [
    {
      id: 2529,
      name: "55555",
      address: "u1other",
      address_verified: false,
      slug: "55555-2529",
      zns_name: null,
      zns_active: false,
      zns_claim_txid: null,
      zns_address_height: null,
      is_maxi: false,
      maxi_source: null,
    },
    {
      id: 2261,
      name: "dm",
      address: "u1zns",
      address_verified: false,
      slug: "dm-2261",
      zns_name: null,
      zns_active: false,
      zns_claim_txid: null,
      zns_address_height: null,
      is_maxi: false,
      maxi_source: null,
    },
  ]);
  assert.deepEqual(decision, { kind: "create" });
});

test("displaces canonical occupant then creates when the same UA belongs to a different username", () => {
  const decision = classifyZnsMatch(registration, [
    {
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
    },
    {
      id: 9,
      name: "bob",
      address: "u1aaa",
      address_verified: false,
      slug: "bob-9",
      zns_name: null,
      zns_active: false,
      zns_claim_txid: null,
      zns_address_height: null,
      is_maxi: false,
      maxi_source: null,
    },
  ]);
  assert.deepEqual(decision, { kind: "displace_and_create", displaceId: 7 });
});

test("displaces canonical occupant then upgrades the same-name same-UA profile", () => {
  const decision = classifyZnsMatch(registration, [
    {
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
    },
    {
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
    },
  ]);
  assert.deepEqual(decision, { kind: "displace_and_upgrade", displaceId: 7, profileId: 9 });
});

test("a second ZNS name on an already-bound UA creates a new row", () => {
  const decision = classifyZnsMatch({
    ...registration,
    name: "alice2",
  }, [{
    id: 5,
    name: "alice",
    address: "u1aaa",
    address_verified: false,
    slug: "alice",
    zns_name: "alice",
    zns_active: true,
    zns_claim_txid: "tx-other",
    zns_address_height: 8,
    is_maxi: false,
    maxi_source: null,
  }]);
  assert.deepEqual(decision, { kind: "create" });
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

test("suffix allocator keeps a profile that is already on its preferred suffix", () => {
  const taken = new Set(["55555-2529"]);
  assert.equal(allocateSuffixSlug("55555", 2529, taken, "55555-2529"), "55555-2529");
});
