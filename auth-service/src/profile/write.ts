/**
 * Profile writes — apply changes to ZcashMe profiles after OTP verification.
 */

import { supabase } from "../supabase.js";
import type { ProfileLink } from "./lookup.js";

export interface ProfileEdits {
  display_name?: string | null;
  bio?: string | null;
  nearest_city_name?: string | null;
  country?: string | null;
  iso2?: string | null;
  links: Array<{
    id?: number | null;
    url: string;
    label: string;
    platform: string;
    is_verified?: boolean;
    _delete?: boolean;
  }>;
}

/**
 * Mark a profile as verified if it isn't already.
 */
export async function markProfileVerified(profileId: number): Promise<void> {
  const { data: profile } = await supabase
    .from("zcasher")
    .select("address_verified")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) throw new Error("Profile not found");
  if (profile.address_verified) return;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("zcasher")
    .update({
      address_verified: true,
      last_verified_at: now,
      verif_expires_at: expiresAt,
    })
    .eq("id", profileId);

  if (error) throw new Error(`markProfileVerified failed: ${error.message}`);
}

/**
 * Apply profile changes (display name, bio, city, links) to Supabase.
 */
export async function applyProfileChanges(
  address: string,
  edits: ProfileEdits,
): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("id")
    .eq("address", address)
    .maybeSingle();

  if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`);
  if (!profile) throw new Error("Profile not found");

  const profileId = profile.id;

  await markProfileVerified(profileId);

  const updates: Record<string, any> = {};
  if (edits.display_name !== undefined) updates.display_name = edits.display_name;
  if (edits.bio !== undefined) updates.bio = edits.bio;
  if (edits.nearest_city_name !== undefined) updates.nearest_city_name = edits.nearest_city_name;
  if (edits.country !== undefined) updates.country = edits.country;
  if (edits.iso2 !== undefined) updates.iso2 = edits.iso2;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("zcasher")
      .update(updates)
      .eq("id", profileId);
    if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);
  }

  for (const link of edits.links) {
    if (link._delete && link.id) {
      const { error } = await supabase
        .from("zcasher_links")
        .delete()
        .eq("id", link.id)
        .eq("zcasher_id", profileId);
      if (error) throw new Error(`Link delete failed: ${error.message}`);
    } else if (link.id) {
      const { error } = await supabase
        .from("zcasher_links")
        .update({ url: link.url, label: link.label, platform: link.platform })
        .eq("id", link.id)
        .eq("zcasher_id", profileId);
      if (error) throw new Error(`Link update failed: ${error.message}`);
    } else {
      const { error } = await supabase.from("zcasher_links").insert({
        zcasher_id: profileId,
        url: link.url,
        label: link.label,
        platform: link.platform,
        is_verified: link.is_verified ?? false,
      });
      if (error) throw new Error(`Link insert failed: ${error.message}`);
    }
  }
}