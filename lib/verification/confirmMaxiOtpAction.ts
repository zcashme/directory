"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { parseMaxiZvsMemo } from "@/lib/verification/session";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

interface ConfirmMaxiResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action: confirm a Maxi upgrade OTP.
 * Verifies the 6-digit code against the 24-digit session memo,
 * then upgrades the profile to Maxi + applies the fixed Maxi theme package.
 */
export async function confirmMaxiOtpAction(
  profileId: number,
  otp: string,
  memo: string
): Promise<ConfirmMaxiResult> {
  try {
    if (!profileId || !otp || typeof otp !== "string" || !otp.trim()) {
      return { ok: false, error: "Invalid input" };
    }
    if (!memo || typeof memo !== "string" || !memo.trim()) {
      return { ok: false, error: "Invalid memo. Please generate a new QR code." };
    }

    const trimmedMemo = memo.trim();

    // Verify OTP (HMAC-SHA256, auto-detects 24-digit session)
    const isValid = await verifyOtp(trimmedMemo, otp.trim());
    if (!isValid) {
      return { ok: false, error: "Invalid verification code." };
    }

    // Parse memo to extract address
    const parsed = parseMaxiZvsMemo(trimmedMemo);
    if (!parsed) {
      return { ok: false, error: "Invalid memo format." };
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    // Verify address matches profile
    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address, is_maxi")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      return { ok: false, error: "Profile not found" };
    }

    if (parsed.userAddress !== profile.address) {
      return { ok: false, error: "Address mismatch." };
    }

    if (profile.is_maxi) {
      return { ok: false, error: "Profile is already upgraded to Maxi." };
    }

    // Upgrade to Maxi and apply the fixed package theme.
    const { error } = await supabase
      .from("zcasher")
      .update({
        is_maxi: true,
        profile_theme_package: "maxi_theme",
        profile_card_theme: null,
        profile_page_bkgd: null,
        profile_card_border: null,
      })
      .eq("id", profileId);

    if (error) {
      return { ok: false, error: error.message || "Failed to upgrade profile" };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) };
  }
}
