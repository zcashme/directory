"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { GetProfileLinksBatchResponse } from "@/lib/api/types";
import type { ProfileLink } from "@/lib/profile/types";
import { fetchLinksByProfileIds } from "@/lib/profile/linksRepository";

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

    const { data: linksById, error: linksError } = await fetchLinksByProfileIds(supabase, zcasherIds);
    if (linksError) {
      return { ok: false, error: linksError, data: {} };
    }

    return {
      ok: true,
      data: Object.fromEntries(linksById) as Record<string, ProfileLink[]>,
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: {},
    };
  }
}
