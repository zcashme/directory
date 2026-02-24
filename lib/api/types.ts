import type { Profile, ProfileLink } from "@/lib/profile/types";
import type { Token } from "@/lib/swap/types";

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  ok: true;
  data: T;
  error?: undefined;
}

/**
 * Standard error response wrapper
 */
export interface ErrorResponse<T = null> {
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
 * Profile links response
 */
export type GetProfileLinksResponse = APIResponse<ProfileLink[]>;

/**
 * Profile links batch response
 */
export type GetProfileLinksBatchResponse = APIResponse<
  Record<string, ProfileLink[]>
>;

/**
 * Directory search result profile
 */
export interface DirectoryResult {
  id: number;
  name: string;
  display_name: string | null;
  address: string | null;
  address_verified: boolean;
  profile_image_url: string | null;
  bio: string | null;
  nearest_city_name: string | null;
  verified_at: string | null;
  verified_links_count: number;
}

/**
 * Directory search response
 */
export interface DirectoryResponse {
  results: DirectoryResult[];
  exists: boolean;
  next_cursor: string | null;
}


/**
 * Swap tokens response
 */
export type GetSwapTokensResponse = APIResponse<Token[]>;

/**
 * Tokens payload (can be array or error object)
 */
export type TokensPayload = Token[] | { error: string };

/**
 * Deposit submit response
 */
export type SubmitDepositResponse = APIResponse<unknown>;

/**
 * NS profiles response
 */
export type GetNsProfilesResponse = APIResponse<Profile[]>;

/**
 * OTP confirmation request
 */
export interface OTPConfirmRequest {
  zcasherId: number | string;
  otp: string;
}

/**
 * OTP confirmation API response
 */
export interface OTPConfirmResponse {
  status: "invalid" | "error" | "unknown" | "confirmed" | string;
  [key: string]: unknown;
}

/**
 * OTP confirmation response wrapper
 */
export type ConfirmOtpResponse = APIResponse<OTPConfirmResponse>;

/**
 * Address validation response
 */
export interface AddressValidation {
  valid: boolean;
  error?: string;
}

/**
 * Blockchain validation result (discriminated union)
 */
export type BlockchainValidation =
  | { valid: true; error?: undefined }
  | { valid: false; error: string };

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
 * Inserted profile link
 */
export interface InsertedProfileLink extends ProfileLinkInput {
  zcasher_id: number;
  is_verified: false;
}

/**
 * Insert profile links response
 */
export interface InsertProfileLinksResponse {
  ok: boolean;
  error?: string;
}

/**
 * Check address taken response
 */
export interface CheckAddressTakenResponse {
  ok: boolean;
  taken: boolean;
  error?: string;
}

/**
 * Check username response
 */
export interface CheckUsernameResponse {
  ok: boolean;
  exists?: boolean;
  verified?: boolean;
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
 * Link verification update
 */
export interface LinkVerificationUpdate {
  profileId: number;
  handle: string;
  variants: string[];
  updatePayload: {
    is_verified: boolean;
    verification_expires_at?: string | null;
    [key: string]: unknown;
  };
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
  avatar_upload?: AvatarUploadPayload;
  links?: ProfileLinkEdit[];
}

export interface AvatarUploadPayload {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/gif";
  extension: "jpg" | "png" | "gif";
  base64Data: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Profile link edit (for insert/update/delete)
 */
export interface ProfileLinkEdit {
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

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
  retryable?: boolean;
}

/**
 * Fetch result generic (can be success or error)
 */
export type FetchResult<T> = T | { error: string };
