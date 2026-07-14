/**
 * ZVS memo building + OTP verification — copied from the directory app.
 * Same HMAC-SHA256 algorithm, same ZVS_SECRET_SEED env var.
 */

import crypto from "node:crypto";

// ── Session ID + memo ──────────────────────────────────────────

export function generateSessionId(length = 16): string {
  const digits = "0123456789";
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) id += digits[bytes[i] % 10];
  return id;
}

export function buildZvsMemo(sessionId: string, address: string): string {
  return `DO NOT MODIFY:{zvs/${sessionId},${address}}`;
}

export function parseZvsMemo(memo: string): { sessionId: string; userAddress: string } | null {
  const match = memo.match(/\{zvs\/(\d{16}),(.+)\}/);
  if (!match) return null;
  return { sessionId: match[1], userAddress: match[2] };
}

// ── ZIP-321 URI ─────────────────────────────────────────────────

export function buildZcashUri(address: string, amount: string, memo: string): string {
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${Buffer.from(memo, "utf8").toString("base64url")}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

// ── OTP verification (HMAC-SHA256) ──────────────────────────────

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

  return expected === providedOtp.trim();
}

// ── Config ─────────────────────────────────────────────────────

export const SERVICE_ADDRESS =
  process.env.SERVICE_ADDRESS ||
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

export const MIN_PAYMENT_ZEC = process.env.MIN_PAYMENT_ZEC || "0.002";