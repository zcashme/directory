import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { CreateProfilePayload, ProfileLinkInput, Profile } from "@/types";

export async function checkAddressTaken(address: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("zcasher")
    .select("id")
    .or(`address.eq.${address.trim()},address.ilike.${address.trim()}`)
    .limit(1);
  return !error && data && data.length > 0;
}

interface CreateProfileResult {
  data: Profile | null;
  error: Error | null;
}

export async function createProfile(profileData: CreateProfilePayload): Promise<CreateProfileResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not available") };
  }

  return supabase.from("zcasher").insert([profileData]).select().single();
}

export async function insertProfileLinks(zcasherId: number, links: ProfileLinkInput[]): Promise<void> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;

  for (const entry of links) {
    await supabase.from("zcasher_links").insert([{
      zcasher_id: zcasherId,
      label: entry.label,
      url: entry.url,
      is_verified: false,
    }]);
  }
}
