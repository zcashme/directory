// lib/social/verifyLink.ts
// Database operations for social link verification

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

interface VerifyLinkResult {
  ok: boolean;
  error?: string;
}

/**
 * Add or update a verified social link for a profile.
 * If a link with the same URL exists, mark it verified.
 * If not, create a new verified link.
 */
export async function upsertVerifiedLink(
  profileId: number,
  url: string
): Promise<VerifyLinkResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client not available" };
  }

  // Try to update existing link first
  const { data: existing, error: findError } = await supabase
    .from("zcasher_links")
    .select("id")
    .eq("zcasher_id", profileId)
    .eq("url", url)
    .maybeSingle();

  if (findError) {
    return { ok: false, error: findError.message };
  }

  if (existing) {
    // Update existing link
    const { error: updateError } = await supabase
      .from("zcasher_links")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }
  } else {
    // Insert new verified link
    const { error: insertError } = await supabase
      .from("zcasher_links")
      .insert({
        zcasher_id: profileId,
        url,
        is_verified: true,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }
  }

  return { ok: true };
}
