import type { Profile, ProfileLink } from "@/lib/profile/types";

/**
 * Standard success response wrapper
 */
interface SuccessResponse<T> {
  ok: true;
  data: T;
  error?: undefined;
}

/**
 * Standard error response wrapper
 */
interface ErrorResponse<T = null> {
  ok: false;
  error: string;
  data?: T;
  retryable?: boolean;
}

/**
 * Generic API response discriminated union
 */
export type APIResponse<T> = SuccessResponse<T> | ErrorResponse<T>;

/**
 * Profile links batch response
 */
export type GetProfileLinksBatchResponse = APIResponse<
  Record<string, ProfileLink[]>
>;

/**
 * NS profiles response
 */
export type GetNsProfilesResponse = APIResponse<Profile[]>;

/**
 * OTP confirmation API response
 */
interface OTPConfirmResponse {
  status: "invalid" | "error" | "unknown" | "confirmed" | string;
  [key: string]: unknown;
}

/**
 * OTP confirmation response wrapper
 */
export type ConfirmOtpResponse = APIResponse<OTPConfirmResponse>;

/**
 * Create profile payload
 */
export interface CreateProfilePayload {
  name: string;
  display_name?: string;
  bio?: string;
  address: string;
  nearest_city_name?: string;
  referred_by?: string;
  referred_by_zcasher_id?: number;
  is_ns?: boolean;
  created_at?: string;
}

/**
 * Create profile response
 */
export type CreateProfileResponse = APIResponse<Profile>;

/**
 * Profile link input
 */
export interface ProfileLinkInput {
  label: string;
  url: string;
  platform?: string;
}

/**
 * Check address taken response
 */
export interface CheckAddressTakenResponse {
  ok: boolean;
  taken: boolean;
  error?: string;
}

export interface CheckUsernameAvailabilityResponse {
  ok: boolean;
  exists: boolean;
  verified_exists: boolean;
  taken_by_other_verified: boolean;
  error?: string;
}

/**
 * Profile edits payload for saving after OTP verification
 */
export interface ProfileEditsPayload {
  name?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  remove_profile_image?: boolean;
  nearest_city_name?: string;
  profile_card_theme?: string;
  profile_page_bkgd?: string;
  profile_card_border?: string;
  avatar_upload?: AvatarUploadPayload;
  links?: ProfileLinkEdit[];
}

interface AvatarUploadPayload {
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  extension: "jpg" | "png";
  base64Data: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Profile link edit (for insert/update/delete)
 */
interface ProfileLinkEdit {
  id?: number | null;
  url: string;
  label?: string;
  platform?: string;
  _delete?: boolean;
}

/**
 * Exchange rate response
 */
export interface ExchangeRate {
  ok: boolean;
  rate?: number;
  source?: string;
  fiat?: string;
  asset?: string;
  error?: string;
  retryable?: boolean;
}
