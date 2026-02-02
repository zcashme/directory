import { supabase } from "@/lib/supabase/supabase-client";

export async function checkAddressTaken(address) {
  const { data, error } = await supabase
    .from("zcasher")
    .select("id")
    .or(`address.eq.${address.trim()},address.ilike.${address.trim()}`)
    .limit(1);
  return !error && data && data.length > 0;
}

export async function createProfile(profileData) {
  return supabase.from("zcasher").insert([profileData]).select().single();
}

export async function insertProfileLinks(zcasherId, links) {
  for (const entry of links) {
    await supabase.from("zcasher_links").insert([{
      zcasher_id: zcasherId,
      label: entry.label,
      url: entry.url,
      is_verified: false,
    }]);
  }
}
