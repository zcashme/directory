"use server";

import { verifyOtp, generateOtp } from "@/lib/verification/otp";
import { parseZvsMemo } from "@/lib/verification/session";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse, ProfileEditsPayload } from "@/lib/api/types";

const isDev = process.env.NODE_ENV !== "production";


/**
 * Server Action for confirming OTP using HMAC-SHA256 verification
 *
 * Stateless flow:
 * 1. Client sends memo (from React state) and OTP (from user input)
 * 2. Server verifies OTP matches the memo using HMAC
 * 3. If valid, mark profile as verified and apply any pending edits
 */
export async function confirmOtpAction(
  zcasherId: number | string,
  otp: string,
  memo: string,
  edits?: ProfileEditsPayload
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

    // In dev, log the expected OTP so you can test without ZVS
    if (isDev) {
      const expectedOtp = await generateOtp(memo.trim());
      console.log("[confirmOtpAction] DEV expected OTP:", expectedOtp);
    }

    console.log("[confirmOtpAction] profileId:", profileId, "otp:", otp.trim(), "memo:", memo.trim());

    // Verify OTP matches the memo
    const isValid = await verifyOtp(memo.trim(), otp.trim());
    console.log("[confirmOtpAction] OTP valid:", isValid);

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

    console.log("[confirmOtpAction] DB profile:", profile, "fetchError:", fetchError);

    if (fetchError || !profile) {
      return {
        ok: false,
        error: "Profile not found",
        data: { status: "error" },
      };
    }

    console.log("[confirmOtpAction] memo address:", parsed.userAddress);
    console.log("[confirmOtpAction] DB address:", profile.address);
    console.log("[confirmOtpAction] match:", parsed.userAddress === profile.address);

    // Verify the address in the memo matches the profile's address
    if (parsed.userAddress !== profile.address) {
      return {
        ok: false,
        error: "Address mismatch. The verification memo does not match this profile.",
        data: { status: "invalid" },
      };
    }

    // Build profile update payload
    const profileUpdate: Record<string, unknown> = {
      address_verified: true,
    };

    // Apply profile edits if provided
    if (edits) {
      if (edits.name !== undefined) profileUpdate.name = edits.name;
      if (edits.display_name !== undefined) profileUpdate.display_name = edits.display_name;
      if (edits.bio !== undefined) profileUpdate.bio = edits.bio;
      if (edits.profile_image_url !== undefined) profileUpdate.profile_image_url = edits.profile_image_url;
      if (edits.nearest_city_id !== undefined) profileUpdate.nearest_city_id = edits.nearest_city_id;
      if (edits.nearest_city_name !== undefined) profileUpdate.nearest_city_name = edits.nearest_city_name;
    }

    console.log("[confirmOtpAction] updating profile with:", profileUpdate);

    // Update profile
    const { error } = await supabase
      .from("zcasher")
      .update(profileUpdate)
      .eq("id", profileId);

    console.log("[confirmOtpAction] update result - error:", error);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to verify profile",
        data: { status: "error" },
      };
    }

    // Handle link edits if provided
    if (edits?.links && edits.links.length > 0) {
      for (const link of edits.links) {
        if (link._delete && link.id) {
          // Delete existing link
          await supabase
            .from("zcasher_links")
            .delete()
            .eq("id", link.id)
            .eq("zcasher_id", profileId);
        } else if (link.id) {
          // Update existing link
          await supabase
            .from("zcasher_links")
            .update({
              url: link.url,
              label: link.label || null,
            })
            .eq("id", link.id)
            .eq("zcasher_id", profileId);
        } else if (!link._delete) {
          // Insert new link
          await supabase.from("zcasher_links").insert({
            zcasher_id: profileId,
            url: link.url,
            label: link.label || null,
            is_verified: false,
          });
        }
      }
    }

    console.log("[confirmOtpAction] SUCCESS - profile verified!");
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
