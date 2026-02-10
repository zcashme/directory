"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import {
  ConfirmThreadOtpResponse,
  PendingThreadMessage,
  ThreadMessageWithProfile,
  StartThreadMessageResponse,
} from "./types";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import { serializeThreadMemo, buildThreadMemo } from "./buildThreadMemo";

/**
 * Start a thread message: creates pending message and returns QR code URI
 * Called after user enters message text
 * Returns memo URI for signing with wallet
 */
export async function startThreadMessageAction(
  zcasherId: number,
  messageText: string,
  signingAddress: string,
  requestId: string
): Promise<StartThreadMessageResponse> {
  if (!zcasherId || zcasherId <= 0) {
    return {
      ok: false,
      error: "Invalid user ID",
    };
  }

  if (!messageText || messageText.trim().length === 0) {
    return {
      ok: false,
      error: "Message cannot be empty",
    };
  }

  if (!signingAddress) {
    return {
      ok: false,
      error: "Signing address required",
    };
  }

  if (!requestId) {
    return {
      ok: false,
      error: "Request ID required",
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        ok: false,
        error: "Database connection failed",
      };
    }

    // Create pending message in database
    const memoHash = btoa(JSON.stringify(buildThreadMemo(messageText, zcasherId))); // Simple hash for tracking

    const { error: insertError } = await supabase
      .from("pending_thread_messages")
      .insert([
        {
          zcasher_id: zcasherId,
          request_id: requestId,
          message_text: messageText,
          memo_hash: memoHash,
        },
      ]);

    if (insertError) {
      console.error("Error creating pending message:", insertError);
      return {
        ok: false,
        error: "Failed to create pending message",
      };
    }

    // Build memo object
    const memo = buildThreadMemo(messageText, zcasherId);
    const memoString = serializeThreadMemo(memo);

    // Build Zcash URI for signing (0 amount, just memo)
    const uri = buildZcashUri(signingAddress, "0", memoString);

    return {
      ok: true,
      data: {
        request_id: requestId,
        memo_uri: uri,
      },
    };
  } catch (error) {
    console.error("Error in startThreadMessageAction:", error);
    return {
      ok: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Confirm thread message with OTP
 * Called after user enters OTP from wallet
 * Promotes pending message to public thread_messages
 */
export async function confirmThreadOtpAction(
  zcasherId: number,
  otp: string
): Promise<ConfirmThreadOtpResponse> {
  if (!zcasherId || zcasherId <= 0) {
    return {
      status: "invalid",
      message: "Invalid user ID",
    };
  }

  if (!otp || otp.trim().length === 0) {
    return {
      status: "invalid",
      message: "OTP cannot be empty",
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        status: "error",
        message: "Database connection failed",
      };
    }

    // Call RPC function to confirm OTP and promote message
    const { data, error } = await supabase.rpc("confirm_thread_otp_sql", {
      in_zcasher_id: zcasherId,
      in_otp: otp.trim(),
    });

    if (error) {
      console.error("RPC error:", error);
      return {
        status: "error",
        message: "OTP verification failed",
      };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        status: "error",
        message: "Unexpected response from server",
      };
    }

    const result = data[0];
    return {
      status: result.status || "error",
      message: result.message || "OTP verification failed",
      message_id: result.message_id,
    };
  } catch (error) {
    console.error("Error in confirmThreadOtpAction:", error);
    return {
      status: "error",
      message: "An unexpected error occurred",
    };
  }
}

/**
 * Fetch public thread messages with associated profile data
 */
export async function fetchThreadMessagesAction(
  limit: number = 50,
  offset: number = 0
): Promise<ThreadMessageWithProfile[]> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return [];
    }

    // Fetch messages with joined profile data
    const { data, error } = await supabase
      .from("thread_messages")
      .select(
        `
        id,
        zcasher_id,
        message_text,
        memo_hash,
        tx_id,
        request_id,
        created_at,
        verified_at,
        is_visible,
        zcasher_searchable!inner(
          id,
          name,
          display_name,
          avatar_url,
          address,
          address_verified
        )
      `
      )
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform data to include profile
    const messages: ThreadMessageWithProfile[] = data.map((msg: any) => ({
      id: msg.id,
      zcasher_id: msg.zcasher_id,
      message_text: msg.message_text,
      memo_hash: msg.memo_hash,
      tx_id: msg.tx_id,
      request_id: msg.request_id,
      created_at: msg.created_at,
      verified_at: msg.verified_at,
      is_visible: msg.is_visible,
      profile: msg.zcasher_searchable
        ? {
            id: msg.zcasher_searchable.id,
            name: msg.zcasher_searchable.name,
            display_name: msg.zcasher_searchable.display_name,
            avatar_url: msg.zcasher_searchable.avatar_url,
            address: msg.zcasher_searchable.address,
            address_verified: msg.zcasher_searchable.address_verified,
          }
        : null,
    }));

    return messages;
  } catch (error) {
    console.error("Error in fetchThreadMessagesAction:", error);
    return [];
  }
}

/**
 * Get pending message for user (for status checking)
 */
export async function getPendingThreadMessageAction(
  zcasherId: number
): Promise<PendingThreadMessage | null> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("pending_thread_messages")
      .select("*")
      .eq("zcasher_id", zcasherId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is expected
      console.error("Error fetching pending message:", error);
    }

    return data || null;
  } catch (error) {
    console.error("Error in getPendingThreadMessageAction:", error);
    return null;
  }
}

/**
 * Delete expired pending messages (cleanup)
 * Can be called periodically or triggered by admin
 */
export async function cleanupExpiredPendingMessagesAction(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return {
        deleted: 0,
        error: "Database connection failed",
      };
    }

    const { data, error } = await supabase
      .from("pending_thread_messages")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      console.error("Error cleaning up expired messages:", error);
      return {
        deleted: 0,
        error: "Cleanup failed",
      };
    }

    return {
      deleted: data?.length || 0,
    };
  } catch (error) {
    console.error("Error in cleanupExpiredPendingMessagesAction:", error);
    return {
      deleted: 0,
      error: "An unexpected error occurred",
    };
  }
}
