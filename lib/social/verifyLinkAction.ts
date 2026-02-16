"use server";

// lib/social/verifyLinkAction.ts
// Server action for adding/updating verified social links

import { upsertVerifiedLink } from "./verifyLink";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

interface VerifyLinkActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Server Action: Add or update a verified social link
 */
export async function verifyLinkAction(
  profileId: number,
  url: string
): Promise<VerifyLinkActionResult> {
  if (!profileId || !url) {
    return { ok: false, error: "Missing profileId or url" };
  }

  // Server-side check: profile must have verified address
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Database unavailable" };
  }

  const { data: profile, error: fetchError } = await supabase
    .from("zcasher")
    .select("verified")
    .eq("id", profileId)
    .single();

  if (fetchError || !profile) {
    return { ok: false, error: "Profile not found" };
  }

  if (!profile.verified) {
    return { ok: false, error: "Address must be verified first" };
  }

  return upsertVerifiedLink(profileId, url);
}
