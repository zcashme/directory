"use server";

import { createProfile, insertProfileLinks, checkAddressTaken } from "@/lib/signup/createProfile";
import {
  getUsernameAvailability,
} from "@/lib/profile/profileQueries";
import type {
  CreateProfileResponse,
  CheckAddressTakenResponse,
  CheckUsernameAvailabilityResponse,
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
 * Server Action for checking username availability and verified ownership collisions.
 */
export async function checkUsernameAvailabilityAction(
  username: string,
  currentProfileId?: number
): Promise<CheckUsernameAvailabilityResponse> {
  try {
    if (!username || typeof username !== "string" || !username.trim()) {
      return {
        ok: true,
        exists: false,
        verified_exists: false,
        taken_by_other_verified: false,
      };
    }

    const availability = await getUsernameAvailability(username, currentProfileId);
    return {
      ok: true,
      exists: availability.exists,
      verified_exists: availability.verifiedExists,
      taken_by_other_verified: availability.takenByOtherVerified,
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      exists: false,
      verified_exists: false,
      taken_by_other_verified: false,
    };
  }
}
