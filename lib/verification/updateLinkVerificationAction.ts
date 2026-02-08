"use server";

import { updateLinkVerification } from "@/lib/profile/verifyLinkDb";
import type { VoidActionResult } from "@/lib/actions/types";
import type { LinkVerificationPayload } from "@/lib/profile/types";

/**
 * Server Action for updating link verification status
 * Used by useVerificationFlow hook
 */
export async function updateLinkVerificationAction(
  profileId: number,
  handle: string,
  variants: string[],
  updatePayload: LinkVerificationPayload
): Promise<VoidActionResult> {
  try {
    if (!profileId || !handle || !Array.isArray(variants) || !updatePayload) {
      return {
        ok: false,
        error: "Invalid input parameters",
      };
    }

    await updateLinkVerification(profileId, handle, variants, updatePayload);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
    };
  }
}
