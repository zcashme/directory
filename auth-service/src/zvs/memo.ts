/**
 * ZVS memo building — constructs payment memos and ZIP-321 URIs.
 */

import crypto from "node:crypto";

/** ZVS wallet that receives the verification payment and sends the OTP response. */
export const ZVS_RECEIVER_ADDRESS =
  process.env.ZVS_RECEIVER_ADDRESS ||
  // Temporary compatibility for existing deployments; new configuration uses
  // ZVS_RECEIVER_ADDRESS so its payment role is explicit.
  process.env.SERVICE_ADDRESS ||
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

export const MIN_PAYMENT_ZEC = process.env.MIN_PAYMENT_ZEC || "0.002";

export function generateSessionId(length = 16): string {
  const digits = "0123456789";
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) id += digits[bytes[i] % 10];
  return id;
}

export function buildZvsMemo(sessionId: string, userAddress: string): string {
  return `DO NOT MODIFY:{zvs/${sessionId},${userAddress}}`;
}

export function parseZvsMemo(memo: string): { sessionId: string; userAddress: string } | null {
  const match = memo.match(/^DO NOT MODIFY:\{zvs\/(\d{16}),(.+)\}$/);
  if (!match) return null;
  return { sessionId: match[1], userAddress: match[2] };
}

export function buildZcashUri(address: string, amount: string, memo: string): string {
  const base = `zcash:${address.trim()}`;
  const params: string[] = [];
  if (amount) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${Buffer.from(memo, "utf8").toString("base64url")}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}
