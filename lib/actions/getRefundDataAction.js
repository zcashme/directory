"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * Server Action for fetching refund data
 * Used by AdminRefundPage component
 */
export async function getRefundDataAction() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("staging_unified")
      .select(`
        txid,
        outgoing_message,
        zip321_uri,
        twitter_url
      `)
      .not("zip321_uri", "is", null)
      .order("mined_time", { ascending: true });

    if (error) {
      console.error("Error fetching refund data:", error);
      return {
        ok: false,
        error: error.message || "Failed to fetch refund data",
        data: [],
      };
    }

    const filtered = (data || []).filter((r) => r.zip321_uri);
    return {
      ok: true,
      data: filtered,
    };
  } catch (error) {
    console.error("Error fetching refund data:", error);
    return {
      ok: false,
      error: String(error?.message || error),
      data: [],
    };
  }
}
