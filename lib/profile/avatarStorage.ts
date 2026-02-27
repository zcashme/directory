import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const AVATAR_BUCKET = "zcashme";
export const AVATAR_FOLDER = "avatars";
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
export const ALLOWED_AVATAR_EXTENSIONS = new Set(["jpg", "png"]);

/** Canonical avatar path: avatars/{id}_zmp.png */
export function avatarPath(profileId: number): string {
  return `${AVATAR_FOLDER}/${profileId}_zmp.png`;
}

export async function removeExistingAvatar(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number
): Promise<{ ok: boolean; error?: string }> {
  const prefix = `${profileId}_zmp`;
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(AVATAR_FOLDER, { limit: 200, search: prefix });

  if (listError) {
    return { ok: false, error: listError.message || "Failed to list existing avatars." };
  }

  const targets = (files || [])
    .map((f) => f.name)
    .filter((name) => new RegExp(`^${profileId}_zmp\\.[^./]+$`, "i").test(name))
    .map((name) => `${AVATAR_FOLDER}/${name}`);

  if (targets.length === 0) return { ok: true };

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove(targets);
  if (removeError) {
    return { ok: false, error: removeError.message || "Failed to remove previous avatar." };
  }
  return { ok: true };
}

/**
 * Download an image from an external URL and upload it to Supabase storage.
 * Returns the public URL of the uploaded file.
 */
export async function downloadAndStoreAvatar(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number,
  externalUrl: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(externalUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "image/jpeg, image/png" },
    });
  } catch {
    return { ok: false, error: "Failed to download profile image from URL." };
  }
  if (!res.ok) {
    return { ok: false, error: `Image download returned HTTP ${res.status}.` };
  }

  const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_AVATAR_MIME_TYPES.has(ct)) {
    return { ok: false, error: `Unsupported image type: ${ct}` };
  }

  const arrayBuffer = await res.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  if (fileBytes.byteLength === 0 || fileBytes.byteLength > MAX_AVATAR_SIZE_BYTES) {
    return { ok: false, error: "Downloaded image is empty or exceeds the 2 MB limit." };
  }

  const removeExisting = await removeExistingAvatar(supabase, profileId);
  if (!removeExisting.ok) {
    return { ok: false, error: removeExisting.error || "Failed to replace existing avatar." };
  }

  const path = avatarPath(profileId);
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, fileBytes, { contentType: ct, upsert: true });

  if (uploadError) {
    return { ok: false, error: uploadError.message || "Failed to upload downloaded avatar." };
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    return { ok: false, error: "Avatar uploaded, but public URL generation failed." };
  }

  return { ok: true, publicUrl };
}
