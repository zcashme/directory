import assert from "node:assert/strict";
import test from "node:test";
import { bech32, bech32m } from "bech32";
import bs58check from "bs58check";
import { isValidSignupAddress } from "./addressValidation.ts";

const unified = "u1vlmjxm26758le2u8ud0std3t0w44ce9dqtfsjcff7366dshqsyax0ps5y84fstd83s6mgrze0yjpxuw82z07nllp5yy6v2ufdztre8yjf5tkhueqcw3a0x8mhn3y2q920x88x9hecrsrsm439lv0zvx7mpscl4ehf37kvmcpy5wlk829";

test("signup accepts a Unified address and trims surrounding whitespace", () => {
  assert.equal(isValidSignupAddress(unified), true);
  assert.equal(isValidSignupAddress(`  ${unified}  `), true);
});

test("signup rejects valid transparent, Sapling, and TEX encodings", () => {
  const payload = new Uint8Array(22);
  payload.set([0x1c, 0xb8]);
  const transparent = bs58check.encode(payload);
  const sapling = bech32.encode("zs", bech32.toWords(new Uint8Array(43)), 200);
  const tex = bech32m.encode("tex", bech32m.toWords(new Uint8Array(20)), 100);
  for (const address of [transparent, sapling, tex]) {
    assert.equal(isValidSignupAddress(address), false);
  }
});

test("signup rejects empty, truncated, and checksum-corrupted Unified addresses", () => {
  for (const address of ["", "   ", "u1invalid", unified.slice(0, -1), `${unified.slice(0, -1)}q`, "uview1example"]) {
    assert.equal(isValidSignupAddress(address), false);
  }
});
