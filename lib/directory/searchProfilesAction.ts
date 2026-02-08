"use server";

import { searchProfiles, checkUsernameExists } from "@/lib/directory/searchProfiles";
import type { ServerActionResult } from "@/types/actions";
import type { Profile } from "@/types";
import type { CheckUsernameResponse } from "@/types/api";

/**
 * Server Action for searching profiles
 * Used by ProfileSearchDropdown component
 */
export async function searchProfilesAction(query: string, limit: number = 20): Promise<ServerActionResult<Profile[]>> {
  try {
    if (!query || typeof query !== "string" || !query.trim()) {
      return { ok: true, data: [] };
    }

    const data = await searchProfiles(query.trim(), limit);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}

/**
 * Server Action for checking if username exists
 * Used by ProfileSearchDropdown and AddUserForm components
 */
export async function checkUsernameExistsAction(username: string): Promise<CheckUsernameResponse> {
  try {
    if (!username || typeof username !== "string" || !username.trim()) {
      return { ok: true, exists: false };
    }

    const exists = await checkUsernameExists(username.trim());
    return { ok: true, exists };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error), exists: false };
  }
}
