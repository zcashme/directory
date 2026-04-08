/**
 * Domain verification token derivation.
 *
 * Tokens are derived deterministically via HMAC-SHA256 over (profileId, domain)
 * using ZVS_SECRET_SEED — no DB storage, no expiry, no cleanup. Equivalent
 * security to a stored random token: unforgeable without the seed, recomputable
 * on demand, stable across attempts.
 */

function getSecretSeedBytes(): Uint8Array {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) {
    throw new Error("ZVS_SECRET_SEED environment variable is required");
  }
  // Same hex decoding as lib/verification/otp.ts
  const bytes = new Uint8Array(seed.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(seed.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derive a stable, unforgeable token for (profileId, domain).
 * Returns a 16-character hex string.
 */
export async function deriveDomainToken(profileId: number, domain: string): Promise<string> {
  const normalizedDomain = domain.trim().toLowerCase();
  const message = new TextEncoder().encode(`${profileId}:${normalizedDomain}`);

  const key = await crypto.subtle.importKey(
    "raw",
    getSecretSeedBytes().slice(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, message);
  const bytes = new Uint8Array(signature);

  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
