/**
 * ZVS OTP Generation using HMAC-SHA256
 *
 * The OTP is deterministically generated from the memo using HMAC-SHA256.
 * This allows both the sender and receiver to independently compute the same OTP.
 */

function getSecretSeed(): string {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ZVS_SECRET_SEED environment variable is required in production');
    }
    // Allow development with placeholder - OTPs will not be secure
    return 'DEV_PLACEHOLDER_SEED';
  }
  return seed;
}

const ZVS_SECRET_SEED = getSecretSeed();

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a 6-digit OTP from a memo using HMAC-SHA256
 *
 * @param memo - The ZVS memo string (e.g., "zvs/2026021505421234,u1d9l0a8...")
 * @returns 6-digit OTP string
 */
export async function generateOtp(memo: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ZVS_SECRET_SEED);
  const messageData = encoder.encode(memo);

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

  // Extract 6 digits from the hash
  // Use first 4 bytes as a 32-bit integer, then mod by 1,000,000
  const hashHex = bytesToHex(hashArray);
  const truncatedHash = parseInt(hashHex.substring(0, 8), 16);
  const otp = (truncatedHash % 1000000).toString().padStart(6, '0');

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
