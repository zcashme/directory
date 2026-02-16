/**
 * ZVS OTP Generation using HMAC-SHA256
 *
 * The OTP is deterministically generated from the session ID using HMAC-SHA256.
 * This matches the ZVS backend (Rust) implementation in otp_rules.rs.
 */

import { parseZvsMemo } from './session';

/**
 * Get the secret seed as hex-decoded bytes (matches ZVS backend)
 */
function getSecretSeedBytes(): Uint8Array {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ZVS_SECRET_SEED environment variable is required in production');
    }
    // Allow development with placeholder - OTPs will not be secure
    return new TextEncoder().encode('DEV_PLACEHOLDER_SEED');
  }
  // Hex-decode the secret (ZVS does: hex::decode(&otp_secret))
  return hexToBytes(seed);
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generate a 6-digit OTP from a memo using HMAC-SHA256
 *
 * Matches ZVS backend: HMAC-SHA256(secret_bytes, session_id)
 *
 * @param memo - The ZVS memo string (e.g., "zvs/2026021505421234,u1d9l0a8...")
 * @returns 6-digit OTP string
 */
export async function generateOtp(memo: string): Promise<string> {
  // Extract session_id from memo (ZVS only hashes session_id, not full memo)
  const parsed = parseZvsMemo(memo);
  if (!parsed) {
    throw new Error('Invalid memo format');
  }
  const sessionId = parsed.sessionId;

  const encoder = new TextEncoder();
  const keyData = getSecretSeedBytes();
  const messageData = encoder.encode(sessionId);

  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Generate HMAC-SHA256
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = new Uint8Array(signature);

  // Extract 6 digits from the hash (matches ZVS: u32::from_be_bytes([0..4]) % 1_000_000)
  const code = ((hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3]) >>> 0;
  const otp = (code % 1000000).toString().padStart(6, '0');

  return otp;
}

/**
 * Verify an OTP against a memo
 *
 * @param memo - The ZVS memo string
 * @param providedOtp - The OTP provided by the user
 * @returns true if the OTP matches
 */
export async function verifyOtp(memo: string, providedOtp: string): Promise<boolean> {
  const expectedOtp = await generateOtp(memo);
  return expectedOtp === providedOtp.trim();
}
