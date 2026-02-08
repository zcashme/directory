// Type definitions for confirmOtpAction

export interface ConfirmOtpData {
  status: "verified" | "verified_and_no_pending_edits" | "invalid" | "locked" | "expired" | "otp_already_used" | string;
  [key: string]: unknown;
}

export interface ConfirmOtpResult {
  ok: boolean;
  data?: ConfirmOtpData;
  error?: string;
}

export function confirmOtpAction(zcasherId: number | undefined, otp: string): Promise<ConfirmOtpResult>;
