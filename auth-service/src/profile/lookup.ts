/**
 * Profile lookup — resolve ZcashMe usernames/addresses to profiles.
 */

import { supabase } from "../supabase.js";

export interface ZcasherRow {
  id: number | null;
  address: string | null;
  name: string | null;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  address_verified: boolean | null;
  nearest_city_name: string | null;
  country: string | null;
  iso2: string | null;
}

export interface ProfileLink {
  id: number;
  url: string;
  label: string;
  platform: string;
  is_verified: boolean;
}

/**
 * Resolve an existing ZcashMe profile by an exact username or profile name.
 */
export async function resolveUsername(input: string): Promise<ZcasherRow | null> {
  const select = "id,address,name,display_name,bio,profile_image_url,address_verified,nearest_city_name,country,iso2";
  const [usernameResult, displayNameResult] = await Promise.all([
    supabase.from("zcasher").select(select).eq("name", input).limit(1).maybeSingle(),
    supabase.from("zcasher").select(select).eq("display_name", input).limit(1).maybeSingle(),
  ]);

  if (usernameResult.error) throw new Error(`resolveUsername failed: ${usernameResult.error.message}`);
  if (displayNameResult.error) throw new Error(`resolveUsername failed: ${displayNameResult.error.message}`);

  const matches = [usernameResult.data, displayNameResult.data]
    .filter((profile): profile is ZcasherRow => profile !== null)
    .filter((profile, index, profiles) => profiles.findIndex((candidate) => candidate.id === profile.id) === index);

  return matches.length === 1 ? matches[0] : null;
}

/**
 * Load all links for a profile by zcasher_id.
 */
export async function loadLinks(profileId: number): Promise<ProfileLink[]> {
  const { data, error } = await supabase
    .from("zcasher_links")
    .select("id,url,label,platform,is_verified")
    .eq("zcasher_id", profileId);

  if (error) throw new Error(`loadLinks failed: ${error.message}`);
  return data ?? [];
}
