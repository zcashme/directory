"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { GetProfileLinksBatchResponse } from "@/lib/api/types";
import type { ProfileLink } from "@/lib/profile/types";

/**
 * Server Action for fetching profile links for multiple profiles
 * Used by useNsDirectory hook
 */
export async function getProfileLinksBatchAction(zcasherIds: number[]): Promise<GetProfileLinksBatchResponse> {
  try {
    if (!Array.isArray(zcasherIds) || zcasherIds.length === 0) {
      return { ok: true, data: {} };
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection error", data: {} };
    }

    const { data, error } = await supabase
      .from("zcasher_links")
      .select("id,label,url,platform,is_verified,zcasher_id")
      .in("zcasher_id", zcasherIds);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to fetch profile links",
        data: {},
      };
    }

    // Group links by zcasher_id
    const linksByProfileId: Record<string, ProfileLink[]> = {};
    (data || []).forEach((link) => {
      if (!linksByProfileId[link.zcasher_id]) {
        linksByProfileId[link.zcasher_id] = [];
      }
      linksByProfileId[link.zcasher_id].push(link);
    });

    return {
      ok: true,
      data: linksByProfileId,
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: {},
    };
  }
}
