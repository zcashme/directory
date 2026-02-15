"use server";

import { verifyOtp } from "@/lib/verification/otp";
import {
  getVerificationSessions,
  deleteVerificationSession,
  decrementSessionAttempts,
  type VerificationSession,
} from "@/lib/verification/verificationSessionAction";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { ConfirmOtpResponse } from "@/lib/api/types";

/**
 * Find which session matches the provided OTP
 * Checks OTP against all active sessions for the user
 */
async function findMatchingSession(
  sessions: VerificationSession[],
  otp: string
): Promise<VerificationSession | null> {
  for (const session of sessions) {
    const matches = await verifyOtp(session.memo, otp);
    if (matches) {
      return session;
    }
  }
  return null;
}

/**
 * Server Action for confirming OTP using HMAC-SHA256 verification
 *
 * Flow:
 * 1. Get all active sessions for the user
 * 2. Check which session's OTP matches
 * 3. If match found, apply that session's pending edits
 * 4. Delete the used session
 */
export async function confirmOtpAction(
  zcasherId: number | string,
  otp: string
): Promise<ConfirmOtpResponse> {
  try {
    // Validate inputs
    if (!zcasherId || !otp || typeof otp !== "string" || !otp.trim()) {
      return {
        ok: false,
        error: "Invalid input",
        data: { status: "invalid" },
      };
    }

    const profileId = typeof zcasherId === "string" ? parseInt(zcasherId, 10) : zcasherId;
    if (isNaN(profileId)) {
      return {
        ok: false,
        error: "Invalid profile ID",
        data: { status: "invalid" },
      };
    }

    // Get all active sessions for this user
    const sessionsResult = await getVerificationSessions(profileId);

    if (!sessionsResult.ok) {
      return {
        ok: false,
        error: sessionsResult.error || "Failed to fetch sessions",
        data: { status: "error" },
      };
    }

    const sessions = sessionsResult.sessions || [];

    if (sessions.length === 0) {
      return {
        ok: false,
        error: "No active verification sessions found. Please generate a new QR code.",
        data: { status: "expired" },
      };
    }

    // With one session per user, we have exactly one session
    const session = sessions[0];

    // Check if attempts remaining before trying
    if (session.attempts_remaining <= 0) {
      return {
        ok: false,
        error: "Too many failed attempts. Please generate a new QR code.",
        data: { status: "locked" },
      };
    }

    // Find which session matches this OTP
    const matchingSession = await findMatchingSession(sessions, otp.trim());

    if (!matchingSession) {
      // OTP didn't match - decrement attempts
      const decrementResult = await decrementSessionAttempts(session.session_id);
      const attemptsLeft = decrementResult.ok ? decrementResult.attemptsRemaining : 0;

      return {
        ok: false,
        error: attemptsLeft > 0
          ? `Invalid code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please generate a new QR code.",
        data: { status: "invalid", attemptsRemaining: attemptsLeft },
      };
    }

    // OTP is valid - apply pending edits
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false,
        error: "Database connection unavailable",
        data: { status: "error" },
      };
    }

    // Call Supabase RPC to apply pending edits
    const { data, error } = await supabase.rpc("apply_pending_edits_sql", {
      in_zcasher_id: profileId,
      in_session_id: matchingSession.session_id,
      in_pending_edits: matchingSession.pending_edits || {},
    });

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to apply edits",
        data: { status: "error" },
      };
    }

    // Clean up the used verification session
    await deleteVerificationSession(matchingSession.session_id);

    return {
      ok: true,
      data: data || { status: "verified" },
    };
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message || error),
      data: { status: "error" },
    };
  }
}
