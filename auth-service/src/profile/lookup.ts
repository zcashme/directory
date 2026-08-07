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
 * Resolve a ZcashMe username or address to a profile.
 */
export async function resolveName(input: string): Promise<ZcasherRow | null> {
  if (/^(u1|z|t1)/.test(input)) {
    return {
      id: null,
      address: input,
      name: null,
      display_name: null,
      bio: null,
      profile_image_url: null,
      address_verified: null,
      nearest_city_name: null,
      country: null,
      iso2: null,
    };
  }

  const escaped = input.replace(/[%_]/g, "\\$&");

  const { data, error } = await supabase
    .from("zcasher")
    .select("id,address,name,display_name,bio,profile_image_url,address_verified,nearest_city_name,country,iso2")
    .ilike("name", escaped)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`resolveName failed: ${error.message}`);
  return data ?? null;
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