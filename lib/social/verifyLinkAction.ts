"use server";

// lib/social/verifyLinkAction.ts
// Server action for adding/updating verified social links

import { upsertVerifiedLink } from "./verifyLink";

interface VerifyLinkActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Server Action: Add or update a verified social link
 */
export async function verifyLinkAction(
  profileId: number,
  url: string
): Promise<VerifyLinkActionResult> {
  if (!profileId || !url) {
    return { ok: false, error: "Missing profileId or url" };
  }

  return upsertVerifiedLink(profileId, url);
}
