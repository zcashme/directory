"use server";

import { generateSessionId, buildZvsMemo } from "@/lib/verification/session";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch { return ""; }
}

function buildZcashUri(address: string, amount: string, memo: string): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

const SIGNIN_ADDR =
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

const MAXI_AMOUNT_ZEC = "1.0";
const MAXI_SESSION_LENGTH = 24;

interface GenerateMaxiMemoResult {
  ok: boolean;
  memo?: string;
  uri?: string;
  error?: string;
}

/**
 * Server action: generate a Maxi upgrade memo + zcash: URI.
 * Uses a 24-digit session ID (vs 16 for standard verification).
 */
export async function generateMaxiMemoAction(
  profileId: number
): Promise<GenerateMaxiMemoResult> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address, is_maxi")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile?.address) {
      return { ok: false, error: "Profile not found" };
    }

    if (profile.is_maxi) {
      return { ok: false, error: "Profile is already upgraded to Maxi" };
    }

    const sessionId = generateSessionId(MAXI_SESSION_LENGTH);
    const memo = buildZvsMemo(sessionId, profile.address);
    const uri = buildZcashUri(SIGNIN_ADDR, MAXI_AMOUNT_ZEC, memo);

    return { ok: true, memo, uri };
  } catch {
    return { ok: false, error: "Failed to generate upgrade memo" };
  }
}
