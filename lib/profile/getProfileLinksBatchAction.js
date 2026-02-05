"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * Server Action for fetching profile links for multiple profiles
 * Used by useNsDirectory hook
 */
export async function getProfileLinksBatchAction(zcasherIds) {
  try {
    if (!Array.isArray(zcasherIds) || zcasherIds.length === 0) {
      return { ok: true, data: {} };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified,zcasher_id")
      .in("zcasher_id", zcasherIds);

    if (error) {
      console.error("Error fetching profile links batch:", error);
      return {
        ok: false,
        error: error.message || "Failed to fetch profile links",
        data: {},
      };
    }

    // Group links by zcasher_id
    const linksByProfileId = {};
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
    console.error("Error fetching profile links batch:", error);
    return {
      ok: false,
      error: String(error?.message || error),
      data: {},
    };
  }
}
