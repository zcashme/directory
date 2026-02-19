"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { parseZvsMemo } from "@/lib/verification/session";
import { getMemoEntry, recordFailure, removeMemo, getMaxAttempts } from "@/lib/verification/memoStore";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse, ProfileEditsPayload } from "@/lib/api/types";
import { derivePlatform } from "@/lib/profile/profileLinks";

/**
 * Server Action for confirming OTP using HMAC-SHA256 verification.
 *
 * The memo must have been issued by generateMemoAction (exists in the
 * in-memory store). Each memo allows at most 5 OTP attempts — after
 * which the server invalidates it and returns a fresh memo + URI so
 * the client can restart without a page reload.
 */
export async function confirmOtpAction(
  zcasherId: number | string,
  otp: string,
  memo: string,
  edits?: ProfileEditsPayload
): Promise<ConfirmOtpResponse> {
  try {
    // --- Input validation ---------------------------------------------------
    if (!zcasherId || !otp || typeof otp !== "string" || !otp.trim()) {
      return { ok: false, error: "Invalid input", data: { status: "invalid" } };
    }

    if (!memo || typeof memo !== "string" || !memo.trim()) {
      return {
        ok: false,
        error: "Invalid memo. Please generate a new QR code.",
        data: { status: "invalid" },
      };
    }

    const profileId =
      typeof zcasherId === "string" ? parseInt(zcasherId, 10) : zcasherId;
    if (isNaN(profileId)) {
      return { ok: false, error: "Invalid profile ID", data: { status: "invalid" } };
    }

    const trimmedMemo = memo.trim();

    // --- Check memo was server-issued ---------------------------------------
    const entry = getMemoEntry(trimmedMemo);
    if (!entry) {
      return {
        ok: false,
        error: "Memo expired or not recognised. Please generate a new QR code.",
        data: { status: "invalid" },
      };
    }

    // --- Verify OTP ---------------------------------------------------------
    const isValid = await verifyOtp(trimmedMemo, otp.trim());

    if (!isValid) {
      // Record the failed attempt; check if exhausted
      const exhausted = recordFailure(trimmedMemo);

      if (exhausted) {
        // Generate a fresh memo + URI for the same profile & amount
        const fresh = await generateMemoAction(profileId, entry.amount);

        return {
          ok: false,
          error: `Too many attempts. A new QR code has been generated — please send a new transaction.`,
          data: {
            status: "exhausted",
            newMemo: fresh.ok ? fresh.memo : undefined,
            newUri: fresh.ok ? fresh.uri : undefined,
          },
        };
      }

      const remaining = getMaxAttempts() - entry.attempts - 1;
      return {
        ok: false,
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        data: { status: "invalid" },
      };
    }

    // --- OTP valid — proceed with verification ------------------------------
    removeMemo(trimmedMemo);

    // Parse memo to extract address
    const parsed = parseZvsMemo(trimmedMemo);
    if (!parsed) {
      return {
        ok: false,
        error: "Invalid memo format.",
        data: { status: "invalid" },
      };
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false,
        error: "Database connection unavailable",
        data: { status: "error" },
      };
    }

    // Verify address matches profile
    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      return { ok: false, error: "Profile not found", data: { status: "error" } };
    }

    if (parsed.userAddress !== profile.address) {
      return {
        ok: false,
        error: "Address mismatch. The verification memo does not match this profile.",
        data: { status: "invalid" },
      };
    }

    // --- Apply profile update -----------------------------------------------
    const profileUpdate: Record<string, unknown> = { address_verified: true };

    if (edits) {
      if (edits.name !== undefined) profileUpdate.name = edits.name;
      if (edits.display_name !== undefined) profileUpdate.display_name = edits.display_name;
      if (edits.bio !== undefined) profileUpdate.bio = edits.bio;
      if (edits.profile_image_url !== undefined) profileUpdate.profile_image_url = edits.profile_image_url;
      if (edits.nearest_city_name !== undefined) profileUpdate.nearest_city_name = edits.nearest_city_name;
    }

    const { error } = await supabase
      .from("zcasher")
      .update(profileUpdate)
      .eq("id", profileId);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to verify profile",
        data: { status: "error" },
      };
    }

    // --- Apply link edits ---------------------------------------------------
    const linkErrors: string[] = [];
    if (edits?.links && edits.links.length > 0) {
      for (const link of edits.links) {
        if (link._delete && link.id) {
          const { error: delErr } = await supabase
            .from("zcasher_links")
            .delete()
            .eq("id", link.id)
            .eq("zcasher_id", profileId);
          if (delErr) linkErrors.push(`delete link ${link.id}: ${delErr.message}`);
        } else if (link.id) {
          const { error: updErr } = await supabase
            .from("zcasher_links")
            .update({
              url: link.url,
              label: link.label || "",
              platform: link.platform ?? derivePlatform(link.url),
            })
            .eq("id", link.id)
            .eq("zcasher_id", profileId);
          if (updErr) linkErrors.push(`update link ${link.id}: ${updErr.message}`);
        } else if (!link._delete) {
          const { error: insErr } = await supabase.from("zcasher_links").insert({
            zcasher_id: profileId,
            url: link.url,
            label: link.label || "",
            platform: link.platform ?? derivePlatform(link.url),
            is_verified: false,
          });
          if (insErr) linkErrors.push(`insert link: ${insErr.message}`);
        }
      }
    }

    if (linkErrors.length > 0) {
      console.error("[confirmOtpAction] link errors:", linkErrors);
      return {
        ok: false,
        error: `Verified, but link updates failed: ${linkErrors.join("; ")}`,
        data: { status: "verified" },
      };
    }

    return { ok: true, data: { status: "verified" } };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: { status: "error" },
    };
  }
}
