/**
 * ZVS OTP verification — HMAC-SHA256 based one-time password.
 */

import crypto from "node:crypto";
import { parseZvsMemo } from "./memo.js";

function getSecretSeed(): Buffer {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) throw new Error("ZVS_SECRET_SEED is required");
  return Buffer.from(seed, "hex");
}

export async function verifyOtp(memo: string, providedOtp: string): Promise<boolean> {
  const parsed = parseZvsMemo(memo);
  if (!parsed) return false;
  const message = Buffer.concat([
    Buffer.from(parsed.sessionId, "utf8"),
    Buffer.from(parsed.userAddress, "utf8"),
  ]);
  const hash = crypto.createHmac("sha256", getSecretSeed()).update(message).digest();
  const code = (hash.readUInt32BE(0)) >>> 0;
  const expected = (code % 1000000).toString().padStart(6, "0");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(providedOtp.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}