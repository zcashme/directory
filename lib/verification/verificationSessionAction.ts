"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export interface VerificationSession {
  id?: number;
  zcasher_id: number;
  session_id: string;
  memo: string;
  pending_edits?: Record<string, unknown>;
  attempts_remaining: number;
  expires_at: string;
  created_at?: string;
}

export interface CreateSessionResult {
  ok: boolean;
  error?: string;
  session?: VerificationSession;
}

export interface GetSessionsResult {
  ok: boolean;
  error?: string;
  sessions?: VerificationSession[];
}

/**
 * Create a new verification session
 * Multiple sessions per user are allowed - each has its own OTP
 * Sessions expire after 24 hours
 */
export async function createVerificationSession(
  zcasherId: number,
  sessionId: string,
  memo: string,
  pendingEdits?: Record<string, unknown>
): Promise<CreateSessionResult> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    // Session expires after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("verification_sessions")
      .insert({
        zcasher_id: zcasherId,
        session_id: sessionId,
        memo,
        pending_edits: pendingEdits || {},
        attempts_remaining: 3,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, session: data };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}

/**
 * Get all active verification sessions for a profile
 * Returns sessions that haven't expired and have attempts remaining
 */
export async function getVerificationSessions(
  zcasherId: number
): Promise<GetSessionsResult> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    const { data, error } = await supabase
      .from("verification_sessions")
      .select("*")
      .eq("zcasher_id", zcasherId)
      .gt("expires_at", new Date().toISOString())
      .gt("attempts_remaining", 0);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, sessions: data || [] };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}

/**
 * Decrement attempts remaining for a specific session
 * Returns the new attempts count
 */
export async function decrementSessionAttempts(
  sessionId: string
): Promise<{ ok: boolean; attemptsRemaining: number; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, attemptsRemaining: 0, error: "Database connection unavailable" };
    }

    // Get current attempts
    const { data: session, error: fetchError } = await supabase
      .from("verification_sessions")
      .select("attempts_remaining")
      .eq("session_id", sessionId)
      .single();

    if (fetchError || !session) {
      return { ok: false, attemptsRemaining: 0, error: fetchError?.message || "Session not found" };
    }

    const newAttempts = Math.max(0, session.attempts_remaining - 1);

    const { error: updateError } = await supabase
      .from("verification_sessions")
      .update({ attempts_remaining: newAttempts })
      .eq("session_id", sessionId);

    if (updateError) {
      return { ok: false, attemptsRemaining: 0, error: updateError.message };
    }

    return { ok: true, attemptsRemaining: newAttempts };
  } catch (error) {
    return { ok: false, attemptsRemaining: 0, error: String((error as Error)?.message || error) };
  }
}

/**
 * Delete a verification session by session_id
 */
export async function deleteVerificationSession(
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database connection unavailable" };
    }

    const { error } = await supabase
      .from("verification_sessions")
      .delete()
      .eq("session_id", sessionId);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}
