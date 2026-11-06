import type { SocialLinkAuthIntent } from "./providers";

/**
 * Database rows created before the column was constrained may contain NULL.
 * Only an explicit true represents an authenticated link.
 */
export function isSocialLinkVerified(value: unknown): boolean {
  return value === true;
}

/** The row state required by the guarded update for each auth operation. */
export function expectedCurrentVerificationState(intent: SocialLinkAuthIntent): boolean {
  return intent !== "verify";
}
