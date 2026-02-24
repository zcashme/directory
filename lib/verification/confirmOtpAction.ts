"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { parseZvsMemo } from "@/lib/verification/session";
import { getMemoEntry, recordFailure, removeMemo, getMaxAttempts } from "@/lib/verification/memoStore";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse, ProfileEditsPayload } from "@/lib/api/types";
import { derivePlatform } from "@/lib/profile/profileLinks";

const AVATAR_BUCKET = "zcashme";
const AVATAR_FOLDER = "avatar_uploads";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);
const ALLOWED_AVATAR_EXTENSIONS = new Set(["jpg", "png", "gif"]);

/**
 * Download an image from an external URL and upload it to Supabase storage.
 * Returns the public URL of the uploaded file, or null on failure.
 */
async function downloadAndStoreAvatar(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number,
  externalUrl: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(externalUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "image/jpeg, image/png, image/gif" },
    });
  } catch {
    return { ok: false, error: "Failed to download profile image from URL." };
  }
  if (!res.ok) {
    return { ok: false, error: `Image download returned HTTP ${res.status}.` };
  }

  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_AVATAR_MIME_TYPES.has(contentType)) {
    return { ok: false, error: `Unsupported image type: ${contentType}` };
  }

  const arrayBuffer = await res.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  if (fileBytes.byteLength === 0 || fileBytes.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return { ok: false, error: "Downloaded image is empty or exceeds the 2 MB limit." };
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
  };

  const removeExisting = await removeExistingAvatarVariants(supabase, profileId);
  if (!removeExisting.ok) {
    return { ok: false, error: removeExisting.error || "Failed to replace existing avatar." };
  }

  const hash = contentHash(fileBytes);
  const avatarPath = `${AVATAR_FOLDER}/${profileId}_avatar_${hash}.${extMap[contentType] || "jpg"}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarPath, fileBytes, { contentType, upsert: true });

  if (uploadError) {
    return { ok: false, error: uploadError.message || "Failed to upload downloaded avatar." };
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    return { ok: false, error: "Avatar uploaded, but public URL generation failed." };
  }

  return { ok: true, publicUrl };
}

function contentHash(bytes: Uint8Array): string {
  // Simple FNV-1a hash — fast, deterministic, no crypto import needed
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function decodeBase64ToBytes(base64Data: string): Uint8Array | null {
  try {
    const normalized = base64Data.replace(/\s+/g, "");
    const buffer = Buffer.from(normalized, "base64");
    if (!buffer || buffer.length === 0) return null;
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function removeExistingAvatarVariants(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  profileId: number
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase client not available." };
  const prefix = `${profileId}_avatar`;
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(AVATAR_FOLDER, { limit: 200, search: prefix });

  if (listError) {
    return { ok: false, error: listError.message || "Failed to list existing avatars." };
  }

  const targets = (files || [])
    .map((f) => f.name)
    .filter((name) => name.toLowerCase() === prefix.toLowerCase() || new RegExp(`^${prefix}\\.[^./]+$`, "i").test(name))
    .map((name) => `${AVATAR_FOLDER}/${name}`);

  if (targets.length === 0) return { ok: true };

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove(targets);
  if (removeError) {
    return { ok: false, error: removeError.message || "Failed to remove previous avatar." };
  }
  return { ok: true };
}

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
    let uploadedAvatarUrl: string | null = null;
    const removeProfileImage = edits?.remove_profile_image === true;

    if (removeProfileImage && edits?.avatar_upload) {
      return {
        ok: false,
        error: "Cannot delete and upload a profile image in the same verification.",
        data: { status: "invalid" },
      };
    }

    if (removeProfileImage) {
      const removeExisting = await removeExistingAvatarVariants(supabase, profileId);
      if (!removeExisting.ok) {
        return {
          ok: false,
          error: removeExisting.error || "Failed to delete profile image.",
          data: { status: "error" },
        };
      }
      profileUpdate.profile_image_url = null;
    }

    if (!removeProfileImage && edits?.avatar_upload) {
      const { mimeType, extension, base64Data, sizeBytes, width, height } = edits.avatar_upload;
      const normalizedMimeType = (mimeType || "").toLowerCase();
      const normalizedExtension = (extension || "").toLowerCase();

      if (!ALLOWED_AVATAR_MIME_TYPES.has(normalizedMimeType)) {
        return { ok: false, error: "Unsupported avatar format.", data: { status: "invalid" } };
      }
      if (!ALLOWED_AVATAR_EXTENSIONS.has(normalizedExtension)) {
        return { ok: false, error: "Unsupported avatar file extension.", data: { status: "invalid" } };
      }
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_AVATAR_SIZE_BYTES) {
        return { ok: false, error: "Avatar file exceeds the 2 MB limit.", data: { status: "invalid" } };
      }
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return { ok: false, error: "Invalid avatar dimensions.", data: { status: "invalid" } };
      }

      const fileBytes = decodeBase64ToBytes(base64Data);
      if (!fileBytes) {
        return { ok: false, error: "Could not decode avatar image.", data: { status: "invalid" } };
      }
      if (fileBytes.byteLength > MAX_AVATAR_SIZE_BYTES) {
        return { ok: false, error: "Avatar file exceeds the 2 MB limit.", data: { status: "invalid" } };
      }

      const removeExisting = await removeExistingAvatarVariants(supabase, profileId);
      if (!removeExisting.ok) {
        return { ok: false, error: removeExisting.error || "Failed to replace existing avatar.", data: { status: "error" } };
      }

      const hash = contentHash(fileBytes);
      const avatarPath = `${AVATAR_FOLDER}/${profileId}_avatar_${hash}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, fileBytes, {
          contentType: normalizedMimeType,
          upsert: true,
        });

      if (uploadError) {
        return {
          ok: false,
          error: uploadError.message || "Failed to upload avatar image.",
          data: { status: "error" },
        };
      }

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
      uploadedAvatarUrl = publicData?.publicUrl || null;
      if (!uploadedAvatarUrl) {
        return {
          ok: false,
          error: "Avatar uploaded, but public URL generation failed.",
          data: { status: "error" },
        };
      }
      profileUpdate.profile_image_url = uploadedAvatarUrl;
    }

    if (edits) {
      if (edits.name !== undefined) profileUpdate.name = edits.name;
      if (edits.display_name !== undefined) profileUpdate.display_name = edits.display_name;
      if (edits.bio !== undefined) profileUpdate.bio = edits.bio;
      if (!removeProfileImage && !uploadedAvatarUrl && edits.profile_image_url !== undefined) {
        // Download external URL and store in Supabase bucket
        if (edits.profile_image_url) {
          const dl = await downloadAndStoreAvatar(supabase, profileId, edits.profile_image_url);
          if (!dl.ok) {
            return { ok: false, error: dl.error, data: { status: "error" } };
          }
          uploadedAvatarUrl = dl.publicUrl;
          profileUpdate.profile_image_url = dl.publicUrl;
        } else {
          profileUpdate.profile_image_url = null;
        }
      }
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
      return {
        ok: false,
        error: `Verified, but link updates failed: ${linkErrors.join("; ")}`,
        data: { status: "verified" },
      };
    }

    return {
      ok: true,
      data: {
        status: "verified",
        profile_image_url:
          typeof profileUpdate.profile_image_url === "string"
            ? profileUpdate.profile_image_url
            : profileUpdate.profile_image_url === null
              ? null
              : undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: { status: "error" },
    };
  }
}
