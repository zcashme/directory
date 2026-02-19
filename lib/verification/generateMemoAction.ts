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
import { registerMemo } from "@/lib/verification/memoStore";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const SIGNIN_ADDR =
  "u1lff6xhc9p2c3aefrms5624aqd5mdlys87xcu0u0g3rynnjfs4g5nf0u5q8sczex3jctc2xesauktvdr9gd77zauaejje3zrdpj4uppssdmzzu33lfkzc9y0hlq7rt94kt4rqpq6d4h8a0px597htclme3pav3wft4k94u4pqqn3h4dmdp8wcvvumgqak5ynwy7qm6e797t356ud38we";

const MIN_AMOUNT = 0.001;


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

    // Register in the in-memory store (tracks attempts)
    registerMemo(memo, profileId, cleanAmount);

    return { ok: true, memo, uri };
  } catch {
    return { ok: false, error: "Failed to generate verification memo" };
  }
}
