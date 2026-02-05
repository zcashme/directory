"use server";

import { updateLinkVerification } from "@/lib/social/verifyLinkDb";

/**
 * Server Action for updating link verification status
 * Used by useVerificationFlow hook
 */
export async function updateLinkVerificationAction(profileId, handle, variants, updatePayload) {
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
    console.error("Error updating link verification:", error);
    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}
