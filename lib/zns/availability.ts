import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";
import { resolveZnsName } from "@/lib/zns/client";
import { getUsernameAvailability } from "@/lib/profile/profileQueries";

export interface UsernameJoinAvailability {
  normalized: string;
  valid: boolean;
  znsOwned: boolean;
  exists: boolean;
  verifiedExists: boolean;
  takenByOtherVerified: boolean;
  waitlistCount: number;
}

export async function getWaitlistCountForName(name: string): Promise<number> {
  const normalized = normalizeZnsName(name);
  if (!normalized) return 0;

  const supabase = createSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("zn_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("name", normalized);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Queue position if this profile reserved now: 1 + others already in line.
 * In-line means zn_waitlist.email_verified or a completed Zcash.me reservation
 * (name_reserved). The current profile is excluded from "others".
 */
export async function getWaitlistQueuePosition(
  name: string,
  excludeZcasherId?: number
): Promise<number> {
  const normalized = normalizeZnsName(name);
  if (!normalized) return 1;

  const supabase = createSupabaseServerClient();
  if (!supabase) return 1;

  const { data, error } = await supabase
    .from("zn_waitlist")
    .select("zcasher_id")
    .eq("name", normalized)
    .or("email_verified.eq.true,name_reserved.eq.true");

  if (error) return 1;

  const others = (data ?? []).filter((row) => {
    if (excludeZcasherId == null) return true;
    return Number(row.zcasher_id) !== Number(excludeZcasherId);
  });

  return 1 + others.length;
}

export async function getUsernameJoinAvailability(
  username: string,
  currentProfileId?: number
): Promise<UsernameJoinAvailability> {
  const normalized = normalizeZnsName(username);
  if (!normalized || !isValidZnsName(normalized)) {
    return {
      normalized,
      valid: false,
      znsOwned: false,
      exists: false,
      verifiedExists: false,
      takenByOtherVerified: false,
      waitlistCount: 0,
    };
  }

  const [zns, zcashers, waitlistCount] = await Promise.all([
    resolveZnsName(normalized),
    getUsernameAvailability(username, currentProfileId),
    getWaitlistCountForName(normalized),
  ]);

  return {
    normalized,
    valid: true,
    znsOwned: Boolean(zns?.address),
    exists: zcashers.exists,
    verifiedExists: zcashers.verifiedExists,
    takenByOtherVerified: zcashers.takenByOtherVerified,
    waitlistCount,
  };
}
