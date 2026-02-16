"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse } from "@/lib/api/types";

/**
 * Server Action for confirming OTP using HMAC-SHA256 verification
 *
 * Stateless flow:
 * 1. Client sends memo (from React state) and OTP (from user input)
 * 2. Server verifies OTP matches the memo using HMAC
 * 3. If valid, mark profile as verified
 */
export async function confirmOtpAction(
  zcasherId: number | string,
  otp: string,
  memo: string
): Promise<ConfirmOtpResponse> {
  try {
    // Validate inputs
    if (!zcasherId || !otp || typeof otp !== "string" || !otp.trim()) {
      return {
        ok: false,
        error: "Invalid input",
        data: { status: "invalid" },
      };
    }

    if (!memo || typeof memo !== "string" || !memo.trim()) {
      return {
        ok: false,
        error: "Invalid memo. Please generate a new QR code.",
        data: { status: "invalid" },
      };
    }

    const profileId = typeof zcasherId === "string" ? parseInt(zcasherId, 10) : zcasherId;
    if (isNaN(profileId)) {
      return {
        ok: false,
        error: "Invalid profile ID",
        data: { status: "invalid" },
      };
    }

    // Verify OTP matches the memo
    const isValid = await verifyOtp(memo.trim(), otp.trim());

    if (!isValid) {
      return {
        ok: false,
        error: "Invalid verification code. Please try again.",
        data: { status: "invalid" },
      };
    }

    // OTP is valid - mark profile as verified
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false,
        error: "Database connection unavailable",
        data: { status: "error" },
      };
    }

    // Update profile verification status
    const { error } = await supabase
      .from("zcasher")
      .update({ verified: true })
      .eq("id", profileId);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to verify profile",
        data: { status: "error" },
      };
    }

    return {
      ok: true,
      data: { status: "verified" },
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: { status: "error" },
    };
  }
}
