/**
 * ZVS OTP Generation using HMAC-SHA256
 *
 * The OTP is deterministically generated from the session ID using HMAC-SHA256.
 * This matches the ZVS backend (Rust) implementation in otp_rules.rs.
 */

import { parseZvsMemo, parseMaxiZvsMemo, parseMaxiOtpZvsMemo } from './session';

/**
 * Get the secret seed as hex-decoded bytes (matches ZVS backend)
 */
function getSecretSeedBytes(): Uint8Array {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) {
    throw new Error('ZVS_SECRET_SEED environment variable is required');
  }
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
 * @param memo - The ZVS memo string (e.g., "DO NOT MODIFY:{zvs/2026021505421234,u1d9l0a8...}")
 * @returns 6-digit OTP string
 */
async function generateOtp(memo: string): Promise<string> {
  // Extract session_id and user_address from memo
  // Auto-detect: try 48-digit maxi OTP, then 24-digit maxi upgrade, then 16-digit standard
  const parsed = parseMaxiOtpZvsMemo(memo) ?? parseMaxiZvsMemo(memo) ?? parseZvsMemo(memo);
  if (!parsed) {
    throw new Error('Invalid memo format');
  }
  const sessionId = parsed.sessionId;
  const userAddress = parsed.userAddress;

  const encoder = new TextEncoder();
  // Use .slice() to get a Uint8Array backed by ArrayBuffer (not ArrayBufferLike)
  const keyData = getSecretSeedBytes().slice();
  // Must hash session_id + user_address to match ZVS Rust backend (otp_rules.rs)
  const sessionBytes = encoder.encode(sessionId);
  const addressBytes = encoder.encode(userAddress);
  const messageData = new Uint8Array(sessionBytes.length + addressBytes.length);
  messageData.set(sessionBytes, 0);
  messageData.set(addressBytes, sessionBytes.length);

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
/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true iff the strings are equal.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyOtp(memo: string, providedOtp: string): Promise<boolean> {
  const expectedOtp = await generateOtp(memo);
  return constantTimeEqual(expectedOtp, providedOtp.trim());
}
