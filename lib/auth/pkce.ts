/**
 * PKCE (Proof Key for Code Exchange) — RFC 7636.
 *
 * Replaces client_secret with a dynamically generated proof.
 * The client sends code_challenge (SHA256 hash of code_verifier)
 * in the authorize request, then sends code_verifier at the token
 * endpoint. We verify SHA256(code_verifier) matches the stored
 * code_challenge.
 */

import crypto from "crypto";

/**
 * Verify that the code_verifier matches the stored code_challenge.
 *
 * @param codeVerifier - The verifier sent at the token endpoint
 * @param codeChallenge - The challenge stored from the authorize request
 * @param method - The challenge method (must be "S256")
 * @returns true if the verifier matches
 */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  if (method !== "S256") return false;

  const hash = crypto.createHash("sha256").update(codeVerifier, "utf8").digest();
  const computed = hash.toString("base64url");

  // Constant-time comparison
  return timingSafeEqual(computed, codeChallenge);
}

/**
 * Generate a random string suitable for OAuth state / nonce values.
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Generate a random authorization code.
 */
export function generateAuthCode(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Compare bufA against itself to keep timing constant,
    // then return false since lengths differ.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}