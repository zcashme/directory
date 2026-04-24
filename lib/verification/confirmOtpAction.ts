"use server";

import { verifyOtp } from "@/lib/verification/otp";
import { parseZvsMemo, parseMaxiOtpZvsMemo } from "@/lib/verification/session";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse, ProfileEditsPayload } from "@/lib/api/types";
import { derivePlatform } from "@/lib/profile/profileLinks";
import { normalizeSocialUsername } from "@/lib/profile/usernameNormalizer";
import type { SocialPlatform } from "@/lib/profile/usernameNormalizer";
import { normalizeUrl } from "@/lib/profile/urlValidation";
import {
  getProfileCardTheme,
  getProfileCardBorder,
  getProfilePageBackground,
  normalizeProfileCardBorderId,
  normalizeProfileCardThemeSelectionId,
  normalizeProfilePageBackgroundId,
  normalizeProfileThemePackageSelectionId,
} from "@/lib/profile/profileCardTheme";
import {
  AVATAR_BUCKET,
  AVATAR_FOLDER,
  MAX_AVATAR_SIZE_BYTES,
  ALLOWED_AVATAR_MIME_TYPES,
  ALLOWED_AVATAR_EXTENSIONS,
  avatarPath,
  removeExistingAvatar,
  downloadAndStoreAvatar,
} from "@/lib/profile/avatarStorage";
import {
  ELIGIBILITY_WINDOW_WEEKS,
  REWARD_DURATION_MONTHS,
  VERIFICATION_FEE_ZEC,
  addMonths,
  addWeeks,
  calculateCommissionRate,
} from "@/lib/leaderboard/rewardProgram";

const AVATAR_HISTORY_FOLDER = "avatar_history";

function isTruthyLikeAddressVerified(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function copyAvatarToHistory(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number
): Promise<void> {
  const prefix = `${profileId}_zmp`;
  const { data: files } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(AVATAR_FOLDER, { limit: 200, search: prefix });

  const existing = (files || [])
    .map((f) => f.name)
    .filter((name) => new RegExp(`^${profileId}_zmp\\.[^./]+$`, "i").test(name));

  for (const name of existing) {
    const srcPath = `${AVATAR_FOLDER}/${name}`;
    const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";
    const historyPath = `${AVATAR_HISTORY_FOLDER}/${profileId}_zmp_${formatTimestamp()}${ext}`;

    const { data } = await supabase.storage.from(AVATAR_BUCKET).download(srcPath);
    if (!data) continue;

    const bytes = new Uint8Array(await data.arrayBuffer());
    await supabase.storage.from(AVATAR_BUCKET).upload(historyPath, bytes, {
      contentType: data.type || "application/octet-stream",
      upsert: false,
    });
  }
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

const SOCIAL_PLATFORMS = new Set<SocialPlatform>([
  "X",
  "GitHub",
  "Instagram",
  "Reddit",
  "LinkedIn",
  "Discord",
  "TikTok",
  "Bluesky",
  "Mastodon",
  "Snapchat",
  "Telegram",
  "Other",
]);

function isSocialPlatform(value: string): value is SocialPlatform {
  return SOCIAL_PLATFORMS.has(value as SocialPlatform);
}

function toPrettyDomain(rawUrl: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  const normalized = normalizeUrl(trimmed);
  try {
    const host = new URL(normalized).hostname || "";
    return host.replace(/^www\./i, "") || trimmed;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function deriveLinkLabelForSave(link: { url: string; label?: string; platform?: string }): string {
  const explicit = (link.label ?? "").trim();
  if (explicit) return explicit;

  const url = (link.url ?? "").trim();
  if (!url) return "";

  const inferredPlatform = (link.platform ?? derivePlatform(url) ?? "Other").trim();
  if (!isSocialPlatform(inferredPlatform) || inferredPlatform === "Other") {
    return toPrettyDomain(url);
  }

  const handle = normalizeSocialUsername(url, inferredPlatform);
  return handle || toPrettyDomain(url);
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

    // --- Verify OTP (stateless HMAC-SHA256 — no server-side memo store) -----
    const isValid = await verifyOtp(trimmedMemo, otp.trim());

    if (!isValid) {
      return {
        ok: false,
        error: "Invalid verification code.",
        data: { status: "invalid_code" },
      };
    }

    // --- OTP valid — proceed with verification ------------------------------

    // Parse memo to extract address (48-digit maxi OTP or 16-digit standard)
    const parsed = parseMaxiOtpZvsMemo(trimmedMemo) ?? parseZvsMemo(trimmedMemo);
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
      .select("address, name, display_name, bio, slug, nearest_city_name, category, referred_by_zcasher_id, iso2, country, first_verified_at, created_at, is_maxi, profile_theme_package")
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
    const now = new Date().toISOString();
    const isMaxi = isTruthyLikeAddressVerified(profile.is_maxi);
    const profileUpdate: Record<string, unknown> = {
      address_verified: true,
      last_verified_at: now,
      ...(profile.first_verified_at ? {} : { first_verified_at: now }),
    };
    if (!isMaxi) {
      profileUpdate.profile_theme_package = null;
      profileUpdate.profile_card_theme = null;
      profileUpdate.profile_page_bkgd = null;
      profileUpdate.profile_card_border = null;
    }
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
      await copyAvatarToHistory(supabase, profileId);
      const removeExisting = await removeExistingAvatar(supabase, profileId);
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

      await copyAvatarToHistory(supabase, profileId);
      const removeExisting = await removeExistingAvatar(supabase, profileId);
      if (!removeExisting.ok) {
        return { ok: false, error: removeExisting.error || "Failed to replace existing avatar.", data: { status: "error" } };
      }

      const path = avatarPath(profileId);
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, fileBytes, {
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

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
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
      if (edits.address !== undefined) {
        const normalizedAddress = edits.address.trim();
        if (!normalizedAddress) {
          return {
            ok: false,
            error: "Address cannot be empty.",
            data: { status: "invalid" },
          };
        }
        profileUpdate.address = normalizedAddress;
      }
      if (edits.name !== undefined) profileUpdate.name = edits.name;
      if (edits.display_name !== undefined) profileUpdate.display_name = edits.display_name;
      if (edits.bio !== undefined) profileUpdate.bio = edits.bio;
      const currentThemePackageSelection = normalizeProfileThemePackageSelectionId(profile.profile_theme_package);
      let activeThemePackage: "maxi_theme" | null = currentThemePackageSelection === "maxi_theme" ? "maxi_theme" : null;

      if (isMaxi && edits.profile_theme_package !== undefined) {
        const normalizedThemePackage = normalizeProfileThemePackageSelectionId(edits.profile_theme_package);
        if (!normalizedThemePackage && edits.profile_theme_package !== "") {
          return {
            ok: false,
            error: "Unsupported profile theme package.",
            data: { status: "invalid" },
          };
        }
        if (normalizedThemePackage === "none") {
          profileUpdate.profile_theme_package = null;
          activeThemePackage = null;
        } else {
          profileUpdate.profile_theme_package = normalizedThemePackage ?? null;
          activeThemePackage = normalizedThemePackage === "maxi_theme" ? "maxi_theme" : null;
        }
      }

      if (activeThemePackage === "maxi_theme") {
        profileUpdate.profile_card_theme = null;
        profileUpdate.profile_page_bkgd = null;
        profileUpdate.profile_card_border = null;
      }

      if (isMaxi && activeThemePackage !== "maxi_theme" && edits.profile_card_theme !== undefined) {
        const normalizedThemeId = normalizeProfileCardThemeSelectionId(edits.profile_card_theme);
        if (!normalizedThemeId && edits.profile_card_theme !== "") {
          return {
            ok: false,
            error: "Unsupported profile card theme.",
            data: { status: "invalid" },
          };
        }
        if (normalizedThemeId === "none") {
          profileUpdate.profile_card_theme = null;
        } else {
          const selectedTheme = getProfileCardTheme(normalizedThemeId);
          profileUpdate.profile_card_theme = selectedTheme?.id ?? null;
        }
      }
      if (isMaxi && activeThemePackage !== "maxi_theme" && edits.profile_page_bkgd !== undefined) {
        const normalizedBackgroundId = normalizeProfilePageBackgroundId(edits.profile_page_bkgd);
        if (!normalizedBackgroundId && edits.profile_page_bkgd !== "") {
          return {
            ok: false,
            error: "Unsupported profile page background.",
            data: { status: "invalid" },
          };
        }
        if (normalizedBackgroundId === "none") {
          profileUpdate.profile_page_bkgd = null;
        } else {
          const selectedBackground = getProfilePageBackground(normalizedBackgroundId);
          profileUpdate.profile_page_bkgd = selectedBackground?.id ?? null;
        }
      }
      if (isMaxi && activeThemePackage !== "maxi_theme" && edits.profile_card_border !== undefined) {
        const normalizedBorderId = normalizeProfileCardBorderId(edits.profile_card_border);
        if (!normalizedBorderId && edits.profile_card_border !== "") {
          return {
            ok: false,
            error: "Unsupported profile card border.",
            data: { status: "invalid" },
          };
        }
        if (normalizedBorderId === "none") {
          profileUpdate.profile_card_border = null;
        } else {
          const selectedBorder = getProfileCardBorder(normalizedBorderId);
          profileUpdate.profile_card_border = selectedBorder?.id ?? null;
        }
      }
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

    // DB constraints for style fields may not allow sentinel values like "none" or empty strings.
    for (const key of ["profile_theme_package", "profile_card_theme", "profile_page_bkgd", "profile_card_border"] as const) {
      if (profileUpdate[key] === "none" || profileUpdate[key] === "") {
        profileUpdate[key] = null;
      }
    }

    let { error } = await supabase
      .from("zcasher")
      .update(profileUpdate)
      .eq("id", profileId);

    if (error) {
      const message = String(error.message || "").toLowerCase();
      const missingStyleColumns = (["profile_card_border", "profile_theme_package"] as const).filter((column) =>
        Object.prototype.hasOwnProperty.call(profileUpdate, column) &&
        message.includes(column) &&
        (message.includes("column") || message.includes("schema"))
      );
      if (missingStyleColumns.length > 0) {
        const fallbackUpdate = { ...profileUpdate };
        for (const column of missingStyleColumns) {
          delete fallbackUpdate[column];
        }
        const fallbackResult = await supabase
          .from("zcasher")
          .update(fallbackUpdate)
          .eq("id", profileId);
        error = fallbackResult.error ?? null;
      }
    }

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to verify profile",
        data: { status: "error" },
      };
    }

    // --- Insert verification snapshot ----------------------------------------
    const { data: currentLinks } = await supabase
      .from("zcasher_links")
      .select("url, label, platform, is_verified")
      .eq("zcasher_id", profileId);

    let referrerProfile: {
      profile_image_url: string | null;
      bio: string | null;
      nearest_city_name: string | null;
    } | null = null;
    if (profile.referred_by_zcasher_id) {
      const { data } = await supabase
        .from("zcasher")
        .select("profile_image_url, bio, nearest_city_name")
        .eq("id", profile.referred_by_zcasher_id)
        .limit(1)
        .maybeSingle();
      referrerProfile = data ?? null;
    }

    const verifiedAtDate = new Date(now);
    const createdAtDate = profile.created_at ? new Date(profile.created_at) : verifiedAtDate;
    const firstVerifiedAtDate = profile.first_verified_at
      ? new Date(profile.first_verified_at)
      : verifiedAtDate;
    const eligibilityDeadline = addWeeks(createdAtDate, ELIGIBILITY_WINDOW_WEEKS);
    const rewardsActivated = firstVerifiedAtDate <= eligibilityDeadline;
    const activeUntilAtVerification = rewardsActivated
      ? addMonths(firstVerifiedAtDate, REWARD_DURATION_MONTHS)
      : null;
    const verifiedLinksCountAtVerification = (currentLinks ?? []).filter((link) => link.is_verified).length;
    const countsForCommission = Boolean(
      profile.referred_by_zcasher_id &&
      activeUntilAtVerification &&
      verifiedAtDate >= firstVerifiedAtDate &&
      verifiedAtDate <= activeUntilAtVerification,
    );
    const commissionRateAtVerification = countsForCommission
      ? calculateCommissionRate({
          verifiedLinksCount: verifiedLinksCountAtVerification,
          hasProfileImage: !!referrerProfile?.profile_image_url,
          hasBio: !!referrerProfile?.bio,
          hasLocation: !!referrerProfile?.nearest_city_name,
        })
      : 0;
    const rewardZats = countsForCommission
      ? Math.round(VERIFICATION_FEE_ZEC * commissionRateAtVerification * 1e8)
      : 0;
    const linksSnapshot = (currentLinks ?? []).map((link) => ({
      url: link.url,
      label: link.label,
      platform: link.platform,
    }));

    await supabase.from("zcasher_verifications").insert({
      zcasher_id: profileId,
      address: profile.address,
      name: profile.name,
      display_name: profile.display_name,
      bio: profile.bio,
      slug: profile.slug,
      nearest_city_name: profile.nearest_city_name,
      category: profile.category,
      referred_by_zcasher_id: profile.referred_by_zcasher_id,
      iso2: profile.iso2,
      country: profile.country,
      links: linksSnapshot,
      commission_rate_at_verification: commissionRateAtVerification,
      reward_zats: rewardZats,
      counts_for_commission: countsForCommission,
      verified_links_count_at_verification: verifiedLinksCountAtVerification,
      active_until_at_verification: activeUntilAtVerification?.toISOString() ?? null,
    });

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
          const resolvedPlatform = link.platform ?? derivePlatform(link.url);
          const resolvedLabel = deriveLinkLabelForSave({
            url: link.url,
            label: link.label,
            platform: resolvedPlatform,
          });
          const { error: updErr } = await supabase
            .from("zcasher_links")
            .update({
              url: link.url,
              label: resolvedLabel,
              platform: resolvedPlatform,
            })
            .eq("id", link.id)
            .eq("zcasher_id", profileId);
          if (updErr) linkErrors.push(`update link ${link.id}: ${updErr.message}`);
        } else if (!link._delete) {
          const resolvedPlatform = link.platform ?? derivePlatform(link.url);
          const resolvedLabel = deriveLinkLabelForSave({
            url: link.url,
            label: link.label,
            platform: resolvedPlatform,
          });
          const { error: insErr } = await supabase.from("zcasher_links").insert({
            zcasher_id: profileId,
            url: link.url,
            label: resolvedLabel,
            platform: resolvedPlatform,
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
