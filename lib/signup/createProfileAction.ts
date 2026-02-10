"use server";

import { createProfile, insertProfileLinks, checkAddressTaken } from "@/lib/signup/createProfile";
import { checkUsernameExists } from "@/lib/directory/searchProfiles";
import { checkUsernameIsVerified } from "@/lib/profile/profileQueries";
import type {
  CreateProfileResponse,
  CheckAddressTakenResponse,
  CheckUsernameResponse,
  CreateProfilePayload,
  ProfileLinkInput,
} from "@/lib/api/types";
import type { VoidActionResult } from "@/lib/actions/types";

/**
 * Server Action for creating a new profile
 * Used by AddUserForm component
 */
export async function createProfileAction(profileData: CreateProfilePayload): Promise<CreateProfileResponse> {
  try {
    const { data, error } = await createProfile(profileData);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to create profile",
      };
    }

    return {
      ok: true,
      data: data!,
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
    };
  }
}

/**
 * Server Action for inserting profile links
 * Used by AddUserForm component
 */
export async function insertProfileLinksAction(zcasherId: number, links: ProfileLinkInput[]): Promise<VoidActionResult> {
  try {
    await insertProfileLinks(zcasherId, links);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
    };
  }
}

/**
 * Server Action for checking if address is taken
 * Used by AddUserForm component for real-time validation
 */
export async function checkAddressTakenAction(address: string): Promise<CheckAddressTakenResponse> {
  try {
    if (!address || typeof address !== "string" || !address.trim()) {
      return { ok: true, taken: false };
    }

    const taken = await checkAddressTaken(address.trim());
    return { ok: true, taken };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      taken: false,
    };
  }
}

/**
 * Server Action for checking if username exists
 * Used by AddUserForm component for real-time validation
 */
export async function checkUsernameExistsForFormAction(username: string): Promise<CheckUsernameResponse> {
  try {
    if (!username || typeof username !== "string" || !username.trim()) {
      return { ok: true, exists: false };
    }

    const exists = await checkUsernameExists(username.trim());
    return { ok: true, exists };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      exists: false,
    };
  }
}

/**
 * Server Action for checking if username is verified
 * Used by AddUserForm component for real-time validation
 */
export async function checkUsernameIsVerifiedAction(username: string): Promise<CheckUsernameResponse> {
  try {
    if (!username || typeof username !== "string" || !username.trim()) {
      return { ok: true, verified: false };
    }

    const verified = await checkUsernameIsVerified(username.trim());
    return { ok: true, verified };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      verified: false,
    };
  }
}
