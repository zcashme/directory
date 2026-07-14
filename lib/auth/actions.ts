"use server";

/**
 * Server actions for the ZcashMe Auth authorize page.
 *
 * These are adapted from the existing ZVS verification actions
 * (generateMemoAction, confirmOtpAction) but for OIDC authentication
 * instead of profile verification.
 *
 * The key difference: after OTP verification, we issue an OIDC
 * authorization code and redirect back to the developer's app,
 * instead of updating a profile in Supabase.
 */

import { generateSessionId, buildZvsMemo } from "@/lib/verification/session";
import { verifyOtp } from "@/lib/verification/otp";
import {
  getAuthSession,
  completeAuthSession,
  issueAuthCode,
} from "./session-store";
import { SERVICE_ADDRESS, MIN_PAYMENT_ZEC } from "./config";

// ── ZIP-321 URI construction ─────────────────────────────────────

function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

function buildZcashUri(address: string, amount: string, memo: string): string {
  const base = `zcash:${address}`;
  const params: string[] = [];

  const numericAmount = Number(amount);
  if (amount && Number.isFinite(numericAmount) && numericAmount >= 0) {
    params.push(`amount=${amount}`);
  }
  if (memo) params.push(`memo=${toBase64Url(memo)}`);

  return params.length ? `${base}?${params.join("&")}` : base;
}

// ── Types ───────────────────────────────────────────────────────

interface GenerateAuthMemoResult {
  ok: boolean;
  memo?: string;
  uri?: string;
  error?: string;
}

interface ConfirmAuthOtpResult {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
}

// ── Server actions ──────────────────────────────────────────────

/**
 * Generate a ZFA authentication memo + ZIP-321 URI.
 *
 * Called by the authorize page after the user enters their Zcash
 * name/address. The server generates the session ID and memo
 * so the client can never fabricate memos to brute-force OTPs.
 *
 * The memo format matches the existing ZVS system:
 *   DO NOT MODIFY:{zvs/<session_id>,<user_address>}
 *
 * The ZFA worker (or existing ZVS backend) watches for payments
 * with this memo and sends an OTP back to the user's wallet.
 */
export async function generateAuthMemoAction(
  authSessionId: string,
  userAddress: string,
): Promise<GenerateAuthMemoResult> {
  try {
    // Verify the auth session exists and is still pending
    const session = getAuthSession(authSessionId);
    if (!session) {
      return { ok: false, error: "Session expired. Please restart." };
    }
    if (session.status !== "pending") {
      return { ok: false, error: "Session already completed." };
    }

    if (!userAddress || !userAddress.trim()) {
      return { ok: false, error: "Address is required." };
    }

    const address = userAddress.trim();

    // Generate a 16-digit session ID (same format as ZVS)
    const sessionId = generateSessionId(16);
    const memo = buildZvsMemo(sessionId, address);
    const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);

    return { ok: true, memo, uri };
  } catch {
    return { ok: false, error: "Failed to generate payment request." };
  }
}

/**
 * Confirm the OTP entered by the user.
 *
 * Verifies the OTP using the same HMAC-SHA256 verification as the
 * existing ZVS system. On success, issues an OIDC authorization
 * code and returns the redirect URL.
 *
 * The developer's app exchanges the code at /auth/token for a
 * signed JWT containing the user's Zcash address.
 */
export async function confirmAuthOtpAction(
  authSessionId: string,
  otp: string,
  memo: string,
  znsName?: string,
  picture?: string,
): Promise<ConfirmAuthOtpResult> {
  try {
    // Validate inputs
    if (!authSessionId || !otp?.trim() || !memo?.trim()) {
      return { ok: false, error: "Invalid input." };
    }

    // Verify the auth session exists
    const session = getAuthSession(authSessionId);
    if (!session) {
      return { ok: false, error: "Session expired. Please restart." };
    }

    // Verify the OTP (HMAC-SHA256, same as ZVS)
    const isValid = await verifyOtp(memo.trim(), otp.trim());

    if (!isValid) {
      return { ok: false, error: "Invalid verification code." };
    }

    // OTP valid — extract address from memo
    // The memo format: DO NOT MODIFY:{zvs/<session_id>,<address>}
    const memoMatch = memo.match(/\{zvs\/(\d+),(.+)\}/);
    if (!memoMatch) {
      return { ok: false, error: "Invalid memo format." };
    }

    const address = memoMatch[2];

    // Mark the session as authenticated
    completeAuthSession(authSessionId, address, znsName, picture);

    // Issue the authorization code and get the redirect URL
    const result = issueAuthCode(authSessionId);
    if (!result) {
      return { ok: false, error: "Failed to issue authorization code." };
    }

    return { ok: true, redirectUrl: result.redirectUrl };
  } catch {
    return { ok: false, error: "Verification failed. Please try again." };
  }
}