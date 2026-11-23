import "server-only";

import type { Profile } from "@/lib/profile/types";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import { OG_SAMPLE, type OgCardModel } from "@/lib/og/renderProfileOg";

const KNOWN_AVATAR_HOSTS = ["id.zcash.me", "fpwrazvgrmatlajjzdiq.supabase.co"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function avatarHosts(): Set<string> {
  const hosts = new Set(KNOWN_AVATAR_HOSTS);
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!raw) return hosts;
  try {
    hosts.add(new URL(raw).host);
  } catch {
    // Ignore a malformed Supabase URL and keep the known hosts.
  }
  return hosts;
}

function sniffMime(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

export async function loadOgAvatar(url: string | null | undefined): Promise<string | null> {
  const raw = (url || "").trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !avatarHosts().has(parsed.host)) return null;

  try {
    const response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "image/png, image/jpeg" },
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;
    const mime = sniffMime(bytes);
    if (!mime) return null;
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function ogCardForProfile(profile: Profile, slug: string): Promise<OgCardModel> {
  const username = getUsernameWithDiscriminator(profile).replace(/\s+/g, "_").trim() || slug.trim();
  const displayName = profile.display_name?.trim() || profile.name?.trim() || username;
  const avatarSrc = await loadOgAvatar(profile.profile_image_url);

  return {
    displayName,
    handle: `/${username}`,
    bio: (profile.bio || "").replace(/\s+/g, " ").trim(),
    meta: OG_SAMPLE.meta,
    address: (profile.address || "").trim(),
    avatarSrc,
    tray: [
      { kind: "x", label: username, domain: "x.com" },
      { kind: "github", label: username, domain: "github.com" },
      { kind: "site", label: username, domain: `${username}.dev` },
    ],
  };
}
