"use server";

import { generateSessionId, buildZvsMemo } from "@/lib/verification/session";
function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch { return ""; }
}

function buildZcashUri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const SIGNIN_ADDR =
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

const MIN_AMOUNT = 0.002;


interface GenerateMemoResult {
  ok: boolean;
  memo?: string;
  uri?: string;
  error?: string;
}

/**
 * Server action: generate a verification memo + zcash: URI.
 *
 * The session ID and memo are created server-side so the client
 * can never fabricate memos to brute-force OTPs.
 */
export async function generateMemoAction(
  profileId: number,
  amount: string
): Promise<GenerateMemoResult> {
  try {
    // Validate amount
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount < MIN_AMOUNT) {
      return { ok: false, error: `Amount must be at least ${MIN_AMOUNT} ZEC` };
    }

    // Look up profile address
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile?.address) {
      return { ok: false, error: "Profile not found" };
    }

    // Generate server-side memo
    const sessionId = generateSessionId();
    const memo = buildZvsMemo(sessionId, profile.address);
    const cleanAmount = amount.replace(/[^\d.]/g, "");
    const uri = buildZcashUri(SIGNIN_ADDR, cleanAmount, memo);

    return { ok: true, memo, uri };
  } catch {
    return { ok: false, error: "Failed to generate verification memo" };
  }
}
