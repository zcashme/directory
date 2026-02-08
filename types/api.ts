// API response patterns and external API types

import type {
  Profile,
  ProfileLink,
  City,
  Token,
} from "./index";

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
 * Search profiles response (special case - includes exists flag)
 */
export interface SearchProfilesResponse {
  profiles: Profile[];
  exists: boolean;
}

/**
 * Search cities response
 */
export type SearchCitiesResponse = APIResponse<City[]>;

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
  name: string; // Username (normalized)
  display_name?: string;
  bio?: string;
  address: string; // Zcash address
  avatar_url?: string;
  nearest_city_id?: number | null;
  nearest_city_name?: string;
}

/**
 * Create profile response
 */
export type CreateProfileResponse = APIResponse<Profile>;

/**
 * Profile link input
 */
export interface ProfileLinkInput {
  label: string; // Custom link label
  url: string; // Full URL
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

/**
 * Link verification update
 */
export interface LinkVerificationUpdate {
  profileId: number;
  handle: string; // Username from verified link
  variants: string[]; // URL variants to match
  updatePayload: {
    is_verified: boolean;
    verification_expires_at?: string | null;
    [key: string]: unknown;
  };
}

/**
 * Exchange rate response
 */
export interface ExchangeRate {
  ok: boolean;
  rate?: number; // Exchange rate value
  source?: string; // Provider name (Coinbase, CoinGecko, CryptoCompare)
  fiat?: string; // Fiat currency code (USD, EUR, etc.)
  asset?: string; // Asset symbol (ZEC, BTC, ETH)
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
