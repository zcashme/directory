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
  const numericAmount = Number(amount);
  if (amount && Number.isFinite(numericAmount) && numericAmount >= 0) {
    params.push(`amount=${amount}`);
  }
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { resolveZnsName, ZnsUnavailableError } from "@/lib/zns/client";

const SIGNIN_ADDR =
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

const MIN_AMOUNT = 0.002;
const ZERO_FEE_SESSION_LENGTH = 48;
const STANDARD_SESSION_LENGTH = 16;

function isTruthyLikeMaxi(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

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
    const cleanAmount = amount.replace(/[^\d.]/g, "");
    const numAmount = parseFloat(cleanAmount);

    // Look up profile address
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    const { data: profile, error: fetchError } = await supabase
      .from("zcasher")
      .select("address, zns_active, zns_name")
      .eq("id", profileId)
      .single();

    if (fetchError || !profile) {
      return { ok: false, error: "Profile not found" };
    }

    let otpAddress = profile.address as string | null;
    if (isTruthyLikeMaxi(profile.zns_active) || Boolean(profile.zns_name)) {
      const znsName = String(profile.zns_name || "");
      try {
        const live = await resolveZnsName(znsName);
        if (!live?.address) {
          return { ok: false, error: "This Zcash Name is not currently registered." };
        }
        otpAddress = live.address;
      } catch (error) {
        if (error instanceof ZnsUnavailableError) {
          return { ok: false, error: "Cannot verify this profile while Zcash Names is unavailable." };
        }
        throw error;
      }
    }

    if (!otpAddress) {
      return { ok: false, error: "Profile not found" };
    }

    const isZnsActive = isTruthyLikeMaxi(profile.zns_active);
    const minAmount = isZnsActive ? 0 : MIN_AMOUNT;

    // Validate amount after profile fetch because minimum is tier-dependent.
    if (!Number.isFinite(numAmount) || numAmount < minAmount) {
      return { ok: false, error: `Amount must be at least ${minAmount} ZEC` };
    }

    // 48-digit sessions route to the zero-fee OTP relayer (former Maxi path).
    const sessionId = generateSessionId(isZnsActive ? ZERO_FEE_SESSION_LENGTH : STANDARD_SESSION_LENGTH);
    const memo = buildZvsMemo(sessionId, otpAddress);
    const uri = buildZcashUri(SIGNIN_ADDR, cleanAmount, memo);

    return { ok: true, memo, uri };
  } catch {
    return { ok: false, error: "Failed to generate verification memo" };
  }
}
