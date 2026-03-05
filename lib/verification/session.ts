/**
 * Generate an ASCII session ID for ZVS verification.
 * Default 16 digits for standard verification, 24 digits for Maxi upgrade.
 * Uses crypto.getRandomValues for secure random number generation.
 */
export function generateSessionId(length: number = 16): string {
  const digits = '0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let sessionId = '';
  for (let i = 0; i < length; i++) {
    sessionId += digits[array[i] % 10];
  }

  return sessionId;
}

/**
 * Build the ZVS memo string
 * Format: DO NOT MODIFY:{zvs/session_id,u-address}
 * Example: DO NOT MODIFY:{zvs/2026021505421234,u1d9l0a8ldht9zcp...}
 */
export function buildZvsMemo(sessionId: string, userAddress: string): string {
  return `DO NOT MODIFY:{zvs/${sessionId},${userAddress}}`;
}

/**
 * Parse a standard ZVS memo string (16-digit session ID)
 * Returns null if the memo format is invalid
 */
export function parseZvsMemo(memo: string): { sessionId: string; userAddress: string } | null {
  const match = memo.match(/\{zvs\/(\d{16}),(.+)\}$/);
  if (!match) return null;

  return {
    sessionId: match[1],
    userAddress: match[2],
  };
}

/**
 * Parse a Maxi ZVS memo string (24-digit session ID)
 * Returns null if the memo format is invalid
 */
export function parseMaxiZvsMemo(memo: string): { sessionId: string; userAddress: string } | null {
  const match = memo.match(/\{zvs\/(\d{24}),(.+)\}$/);
  if (!match) return null;

  return {
    sessionId: match[1],
    userAddress: match[2],
  };
}
