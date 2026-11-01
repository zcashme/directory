"use server";

interface ConfirmMaxiResult {
  ok: boolean;
  error?: string;
}

/**
 * Maxi Mode has been retired. ZNS-backed profiles own the former Maxi perks.
 */
export async function confirmMaxiOtpAction(
  _profileId: number,
  _otp: string,
  _memo: string
): Promise<ConfirmMaxiResult> {
  return { ok: false, error: "Maxi Mode is no longer available." };
}
