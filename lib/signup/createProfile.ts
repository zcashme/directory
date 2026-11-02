import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { Profile } from "@/lib/profile/types";
import type { CreateProfilePayload, ProfileLinkInput } from "@/lib/api/types";
import { derivePlatform } from "@/lib/profile/profileLinks";

export async function checkAddressTaken(_address: string): Promise<boolean> {
  return false;
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
      platform: entry.platform ?? derivePlatform(entry.url),
      is_verified: false,
    }]);
  }
}

export async function insertVerifiedProfileLink(zcasherId: number, link: ProfileLinkInput): Promise<void> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("zcasher_links").insert([{
    zcasher_id: zcasherId,
    label: link.label,
    url: link.url,
    platform: link.platform ?? derivePlatform(link.url),
    is_verified: true,
    verified_at: new Date().toISOString(),
  }]);
}
