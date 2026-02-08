"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { GetProfileLinksResponse } from "@/lib/api/types";

/**
 * Server Action for fetching profile links
 * Used by useProfileLinks hook
 */
export async function getProfileLinksAction(zcasherId: number | string | null | undefined): Promise<GetProfileLinksResponse> {
  try {
    if (!zcasherId) {
      return { ok: true, data: [] };
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection error", data: [] };
    }

    const { data, error } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified")
      .eq("zcasher_id", zcasherId)
      .order("id", { ascending: true });

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to fetch profile links",
        data: [],
      };
    }

    return {
      ok: true,
      data: data || [],
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: [],
    };
  }
}
