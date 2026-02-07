"use server";

import { searchProfiles, checkUsernameExists } from "@/lib/directory/searchProfiles";

/**
 * Server Action for searching profiles
 * Used by ProfileSearchDropdown component
 */
export async function searchProfilesAction(query, limit = 20) {
  try {
    if (!query || typeof query !== "string" || !query.trim()) {
      return { ok: true, data: [] };
    }

    const data = await searchProfiles(query.trim(), limit);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error?.message || error), data: [] };
  }
}

/**
 * Server Action for checking if username exists
 * Used by ProfileSearchDropdown and AddUserForm components
 */
export async function checkUsernameExistsAction(username) {
  try {
    if (!username || typeof username !== "string" || !username.trim()) {
      return { ok: true, exists: false };
    }

    const exists = await checkUsernameExists(username.trim());
    return { ok: true, exists };
  } catch (error) {
    return { ok: false, error: String(error?.message || error), exists: false };
  }
}
