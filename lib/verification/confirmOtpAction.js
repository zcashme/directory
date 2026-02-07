"use server";

import { confirmOtp } from "@/lib/verification/confirmOtp";

/**
 * Server Action for confirming OTP
 * Used by InlineOtpForm and SubmitOtp components
 */
export async function confirmOtpAction(zcasherId, otp) {
  try {
    if (!zcasherId || !otp || typeof otp !== "string" || !otp.trim()) {
      return {
        ok: false,
        error: "Invalid input",
        data: { status: "invalid" },
      };
    }

    const { data, error } = await confirmOtp(zcasherId, otp.trim());

    if (error) {
      return {
        ok: false,
        error: error.message || "OTP confirmation failed",
        data: { status: "error" },
      };
    }

    return {
      ok: true,
      data: data || { status: "unknown" },
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      data: { status: "error" },
    };
  }
}
