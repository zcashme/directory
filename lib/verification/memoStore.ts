/**
 * In-memory store for server-issued verification memos.
 *
 * Tracks which memos the server has generated and how many OTP
 * attempts have been made against each. Memos not in this store
 * are rejected — preventing client-crafted memo brute-force attacks.
 */

interface MemoEntry {
  attempts: number;
  createdAt: number;
  profileId: number;
  amount: string;
}

const store = new Map<string, MemoEntry>();

const MAX_ATTEMPTS = 5;
const MEMO_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Register a newly generated memo as valid. */
export function registerMemo(memo: string, profileId: number, amount: string): void {
  cleanup();
  store.set(memo, { attempts: 0, createdAt: Date.now(), profileId, amount });
}

/** Check whether a memo exists and is still valid. */
export function getMemoEntry(memo: string): MemoEntry | null {
  const entry = store.get(memo);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > MEMO_TTL_MS) {
    store.delete(memo);
    return null;
  }
  return entry;
}

/**
 * Record a failed OTP attempt.
 * Returns true if the memo is now exhausted (>= MAX_ATTEMPTS).
 */
export function recordFailure(memo: string): boolean {
  const entry = store.get(memo);
  if (!entry) return false;
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(memo);
    return true;
  }
  return false;
}

/** Remove a memo (e.g. after successful verification). */
export function removeMemo(memo: string): void {
  store.delete(memo);
}

export function getMaxAttempts(): number {
  return MAX_ATTEMPTS;
}

/** Evict expired entries. */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > MEMO_TTL_MS) store.delete(key);
  }
}
