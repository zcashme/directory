import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const AVATAR_BUCKET = "zcashme";
export const AVATAR_FOLDER = "avatar_uploads";
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);
export const ALLOWED_AVATAR_EXTENSIONS = new Set(["jpg", "png", "gif"]);

export function contentHash(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export async function removeExistingAvatarVariants(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number
): Promise<{ ok: boolean; error?: string }> {
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
      headers: { Accept: "image/jpeg, image/png, image/gif" },
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
  const avatarPath = `${AVATAR_FOLDER}/${profileId}_avatar_${hash}.${extMap[ct] || "jpg"}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarPath, fileBytes, { contentType: ct, upsert: true });

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
