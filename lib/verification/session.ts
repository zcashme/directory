/**
 * Generate a 16-digit ASCII session ID for ZVS verification
 * Uses crypto.getRandomValues for secure random number generation
 */
export function generateSessionId(): string {
  const digits = '0123456789';
  const array = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto (shouldn't happen in modern browsers)
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let sessionId = '';
  for (let i = 0; i < 16; i++) {
    sessionId += digits[array[i] % 10];
  }

  return sessionId;
}

/**
 * Build the ZVS memo string
 * Format: (DO NOT MODIFY):{zvs/session_id,u-address}
 * Example: (DO NOT MODIFY):{zvs/2026021505421234,u1d9l0a8ldht9zcp...}
 */
export function buildZvsMemo(sessionId: string, userAddress: string): string {
  return `(DO NOT MODIFY):{zvs/${sessionId},${userAddress}}`;
}

/**
 * Parse a ZVS memo string
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
