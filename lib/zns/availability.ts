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
  protected: boolean;
}

export type ProtectedNameKind = "none" | "protected" | "zm_priority";

export interface ProtectedNameInfo {
  kind: ProtectedNameKind;
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

export async function getProtectedNameInfo(name: string): Promise<ProtectedNameInfo> {
  const normalized = normalizeZnsName(name);
  if (!normalized) return { kind: "none" };

  const supabase = createSupabaseServerClient();
  if (!supabase) return { kind: "none" };

  const { data, error } = await supabase
    .from("zn_protected_names")
    .select("normalized_name, zm_priority_claim")
    .eq("normalized_name", normalized)
    .eq("status", "protected")
    .limit(1)
    .maybeSingle();

  if (error || !data?.normalized_name) {
    return { kind: "none" };
  }

  const kind: ProtectedNameKind = data.zm_priority_claim === true ? "zm_priority" : "protected";
  return { kind };
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
      protected: false,
    };
  }

  const [zns, zcashers, waitlistCount, protectedName] = await Promise.all([
    resolveZnsName(normalized),
    getUsernameAvailability(username, currentProfileId),
    getWaitlistCountForName(normalized),
    getProtectedNameInfo(normalized),
  ]);

  return {
    normalized,
    valid: true,
    znsOwned: Boolean(zns?.address),
    exists: zcashers.exists,
    verifiedExists: zcashers.verifiedExists,
    takenByOtherVerified: zcashers.takenByOtherVerified,
    waitlistCount,
    protected: protectedName.kind !== "none",
  };
}
