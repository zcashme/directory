/**
 * Build thread message memo in format: {z:ZCASHER_ID,t:"message text"}
 * Max memo size: 512 bytes (Zcash limit)
 * Safe character limit: ~400 chars (accounting for emojis and JSON overhead)
 */

import { ThreadMemoFormat } from "./types";

/**
 * Calculate byte size of a string using UTF-8 encoding
 */
export function calculateByteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Maximum safe message length (accounting for JSON structure overhead)
 * Structure: {z:123,t:"..."}
 * Overhead: ~20 bytes for structure
 * Max memo: 512 bytes
 * Safe limit: 400 chars
 */
export const MAX_MESSAGE_CHARS = 400;
export const MEMO_BYTE_LIMIT = 512;
export const OVERHEAD_BYTES = 20; // Approximate bytes for {z:ZID,t:""}

/**
 * Check if message text exceeds byte limit
 */
export function isMessageTooLarge(text: string): boolean {
  const memoJson = buildThreadMemo(text, 1); // Use dummy ID for size calculation
  const bytes = calculateByteSize(JSON.stringify(memoJson));
  return bytes > MEMO_BYTE_LIMIT;
}

/**
 * Get byte size of message when encoded in memo format
 */
export function getMessageMemoByteSize(text: string, zcasherId: number): number {
  const memo = buildThreadMemo(text, zcasherId);
  return calculateByteSize(JSON.stringify(memo));
}

/**
 * Build the thread message memo object
 * @param messageText - The message content
 * @param zcasherId - The user's zcasher ID
 * @returns Memo object: { z: zcasherId, t: messageText }
 */
export function buildThreadMemo(
  messageText: string,
  zcasherId: number
): ThreadMemoFormat {
  return {
    z: zcasherId,
    t: messageText,
  };
}

/**
 * Convert memo object to JSON string for encoding in Zcash memo field
 */
export function serializeThreadMemo(memo: ThreadMemoFormat): string {
  return JSON.stringify(memo);
}

/**
 * Parse a thread memo from JSON string
 * @param memoString - JSON string from Zcash memo field
 * @returns Parsed memo object or null if invalid
 */
export function parseThreadMemo(memoString: string): ThreadMemoFormat | null {
  try {
    const parsed = JSON.parse(memoString);
    if (typeof parsed === "object" && "z" in parsed && "t" in parsed) {
      return {
        z: Number(parsed.z),
        t: String(parsed.t),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate thread message format
 */
export function isValidThreadMemo(memo: unknown): memo is ThreadMemoFormat {
  if (typeof memo !== "object" || memo === null) return false;

  const m = memo as Record<string, unknown>;

  return (
    typeof m.z === "number" &&
    typeof m.t === "string" &&
    m.z > 0 &&
    m.t.length > 0 &&
    m.t.length <= MAX_MESSAGE_CHARS
  );
}

/**
 * Get error message for oversized message
 */
export function getMessageSizeError(text: string, zcasherId: number): string | null {
  const bytes = getMessageMemoByteSize(text, zcasherId);

  if (bytes > MEMO_BYTE_LIMIT) {
    const chars = text.length;
    const overage = bytes - MEMO_BYTE_LIMIT;
    return `Message is too large for blockchain memo. Your message uses ${bytes} bytes (limit: ${MEMO_BYTE_LIMIT}). Please reduce your message by approximately ${overage} bytes.`;
  }

  return null;
}

/**
 * Get message byte size for display (shows user how much space they're using)
 */
export function formatMessageByteDisplay(text: string, zcasherId: number): string {
  const bytes = getMessageMemoByteSize(text, zcasherId);
  const percentage = Math.round((bytes / MEMO_BYTE_LIMIT) * 100);

  return `${bytes}/${MEMO_BYTE_LIMIT} bytes (${percentage}%)`;
}

/**
 * Truncate message to fit within memo limit
 * Returns truncated message that fits, or null if can't fit even 1 char
 */
export function truncateMessageToFit(
  text: string,
  zcasherId: number
): string | null {
  if (!text) return "";

  // Start with the full text and reduce until it fits
  let truncated = text;

  while (truncated.length > 0) {
    const memo = buildThreadMemo(truncated, zcasherId);
    const bytes = calculateByteSize(JSON.stringify(memo));

    if (bytes <= MEMO_BYTE_LIMIT) {
      return truncated;
    }

    // Remove last character and try again
    truncated = truncated.slice(0, -1);
  }

  return null; // Can't fit any text
}
