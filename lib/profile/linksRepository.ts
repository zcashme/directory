import type { ProfileLink } from "@/lib/profile/types";

/**
 * Fetches links for multiple profiles and groups them by zcasher_id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchLinksByProfileIds(supabase: any, ids: number[]): Promise<{ data: Map<number, any[]>; error: string | null }> {
  if (ids.length === 0) return { data: new Map(), error: null };
  const { data, error } = await supabase
    .from("zcasher_links")
    .select("id,label,url,platform,is_verified,zcasher_id")
    .in("zcasher_id", ids)
    .order("id", { ascending: true });
  if (error) return { data: new Map(), error: error.message as string };
  const map = new Map<number, any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const link of data ?? []) {
    const list = map.get(link.zcasher_id) ?? [];
    list.push(link);
    map.set(link.zcasher_id, list);
  }
  return { data: map, error: null };
}

/**
 * Fetches links for a single profile ordered by id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchLinksForProfileId(supabase: any, zcasherId: number): Promise<{ data: ProfileLink[]; error: string | null }> {
  const { data, error } = await supabase
    .from("zcasher_links")
    .select("id,label,url,platform,is_verified,zcasher_id")
    .eq("zcasher_id", zcasherId)
    .order("id", { ascending: true });
  return { data: (data ?? []) as ProfileLink[], error: error?.message ?? null };
}
