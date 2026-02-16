"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { parseZvsMemo } from "@/lib/verification/session";
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

    // Parse memo to extract the address
    const parsed = parseZvsMemo(memo.trim());
    if (!parsed) {
      return {
        ok: false,
        error: "Invalid memo format.",
        data: { status: "invalid" },
      };
    }

    // OTP is valid - verify address matches profile
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false,
        error: "Database connection unavailable",
        data: { status: "error" },
      };
    }

    // Fetch profile to verify address matches
    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      return {
        ok: false,
        error: "Profile not found",
        data: { status: "error" },
      };
    }

    // Verify the address in the memo matches the profile's address
    if (parsed.userAddress !== profile.address) {
      return {
        ok: false,
        error: "Address mismatch. The verification memo does not match this profile.",
        data: { status: "invalid" },
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
