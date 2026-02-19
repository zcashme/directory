"use server";

// lib/social/verifyLink.ts
// Server action: auto-persist a verified social link

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function upsertVerifiedLink(
  profileId: number,
  url: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase client not available" };

  // Only address-verified profiles can authenticate social links
  const { data: profile, error: profileError } = await supabase
    .from("zcashers")
    .select("address_verified")
    .eq("id", profileId)
    .single();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile?.address_verified) return { ok: false, error: "Address must be verified first" };

  const { data: existing, error: findError } = await supabase
    .from("zcasher_links")
    .select("id")
    .eq("zcasher_id", profileId)
    .eq("url", url)
    .maybeSingle();

  if (findError) return { ok: false, error: findError.message };

  if (existing) {
    const { error } = await supabase
      .from("zcasher_links")
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("zcasher_links")
      .insert({ zcasher_id: profileId, url, is_verified: true, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
