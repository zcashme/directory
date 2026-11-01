"use server";

interface GenerateMaxiMemoResult {
  ok: boolean;
  memo?: string;
  uri?: string;
  error?: string;
}

/**
 * Maxi Mode has been retired. ZNS-backed profiles own the former Maxi perks.
 */
export async function generateMaxiMemoAction(
  _profileId: number
): Promise<GenerateMaxiMemoResult> {
  return { ok: false, error: "Maxi Mode is no longer available." };
}
