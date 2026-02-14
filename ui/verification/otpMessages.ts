/**
 * OTP Status Messages - Centralized source of truth for OTP verification states
 *
 * This module provides standardized messages for all OTP verification outcomes.
 * Used by useOtpFlow hook and OTP components to ensure consistent messaging.
 */

/**
 * All possible OTP status codes returned by the server
 */
export type OtpStatusCode =
  | "verified"
  | "verified_and_no_pending_edits"
  | "invalid"
  | "locked"
  | "expired"
  | "otp_already_used"
  | "error"
  | "unknown";

/**
 * Result type for OTP verification
 * - "success": OTP was accepted and profile updated
 * - "error": OTP was rejected or an error occurred
 */
export type OtpStatus = "ok" | "fail";

/**
 * OTP message structure with variant support
 */
export interface OtpMessage {
  /** Result type (success or error) */
  variant: OtpStatus;

  /** Message text to display */
  text: string;

  /** Color class for styling (e.g., "text-green-700") */
  color: string;
}

/**
 * Centralized OTP status message definitions
 * Maps server status codes to user-facing messages
 */
const OTP_MESSAGES: Record<OtpStatusCode, OtpMessage> = {
  verified: {
    variant: "ok",
    text: "Your profile has been updated. Close to refresh the page.",
    color: "text-green-700",
  },
  verified_and_no_pending_edits: {
    variant: "ok",
    text: "Your address is verified, but there were no changes to apply.",
    color: "text-green-700",
  },
  invalid: {
    variant: "fail",
    text: "Incorrect code. Please try again.",
    color: "text-red-600",
  },
  locked: {
    variant: "fail",
    text: "Too many failed attempts. This OTP is now locked.",
    color: "text-red-600",
  },
  expired: {
    variant: "fail",
    text: "This OTP has expired. Request a new one.",
    color: "text-red-600",
  },
  otp_already_used: {
    variant: "fail",
    text: "This OTP was already used. Generate a new one.",
    color: "text-red-600",
  },
  error: {
    variant: "fail",
    text: "An unexpected error occurred. Please try again.",
    color: "text-red-600",
  },
  unknown: {
    variant: "fail",
    text: "Unexpected response from server.",
    color: "text-red-600",
  },
};

/**
 * Get standardized message for an OTP status code
 *
 * @param status - Status code from server response
 * @returns OtpMessage object with variant, text, and color
 *
 * @example
 * ```typescript
 * const message = getOtpMessage("verified");
 * // Returns: { variant: "ok", text: "Your profile has been updated...", color: "text-green-700" }
 *
 * const unknownMessage = getOtpMessage("invalid_status");
 * // Returns: { variant: "fail", text: "Unexpected response from server.", color: "text-red-600" }
 * ```
 */
export function getOtpMessage(status: string | null | undefined): OtpMessage {
  if (!status) {
    return OTP_MESSAGES.unknown;
  }

  return OTP_MESSAGES[status as OtpStatusCode] || OTP_MESSAGES.unknown;
}
