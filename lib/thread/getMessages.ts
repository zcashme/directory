/**
 * Server-side fetcher for thread messages
 * Used during page rendering to fetch initial message list
 */

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { ThreadMessageWithProfile, FetchThreadMessagesResponse } from "./types";

/**
 * Fetch public thread messages for initial page load
 * This is used in server components and during SSR
 */
export async function getThreadMessages(
  limit: number = 50,
  offset: number = 0
): Promise<ThreadMessageWithProfile[]> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      console.warn("Supabase client not available");
      return [];
    }

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
      console.error("Supabase query error:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Transform the data
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
            display_name: msg.zcasher_searchable.display_name || msg.zcasher_searchable.name,
            avatar_url: msg.zcasher_searchable.avatar_url,
            address: msg.zcasher_searchable.address,
            address_verified: msg.zcasher_searchable.address_verified,
          }
        : null,
    }));

    return messages;
  } catch (error) {
    console.error("Error fetching thread messages:", error);
    return [];
  }
}

/**
 * Fetch a single thread message by ID
 */
export async function getThreadMessageById(
  messageId: number
): Promise<ThreadMessageWithProfile | null> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return null;
    }

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
      .eq("id", messageId)
      .eq("is_visible", true)
      .single();

    if (error) {
      console.error("Error fetching message:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      zcasher_id: data.zcasher_id,
      message_text: data.message_text,
      memo_hash: data.memo_hash,
      tx_id: data.tx_id,
      request_id: data.request_id,
      created_at: data.created_at,
      verified_at: data.verified_at,
      is_visible: data.is_visible,
      profile: data.zcasher_searchable
        ? {
            id: data.zcasher_searchable.id,
            name: data.zcasher_searchable.name,
            display_name: data.zcasher_searchable.display_name || data.zcasher_searchable.name,
            avatar_url: data.zcasher_searchable.avatar_url,
            address: data.zcasher_searchable.address,
            address_verified: data.zcasher_searchable.address_verified,
          }
        : null,
    };
  } catch (error) {
    console.error("Error in getThreadMessageById:", error);
    return null;
  }
}

/**
 * Get thread messages by user
 */
export async function getThreadMessagesByUser(
  zcasherId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ThreadMessageWithProfile[]> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return [];
    }

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
      .eq("zcasher_id", zcasherId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching user messages:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((msg: any) => ({
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
            display_name: msg.zcasher_searchable.display_name || msg.zcasher_searchable.name,
            avatar_url: msg.zcasher_searchable.avatar_url,
            address: msg.zcasher_searchable.address,
            address_verified: msg.zcasher_searchable.address_verified,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error in getThreadMessagesByUser:", error);
    return [];
  }
}

/**
 * Get total count of thread messages
 */
export async function getThreadMessageCount(): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return 0;
    }

    const { count, error } = await supabase
      .from("thread_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_visible", true);

    if (error) {
      console.error("Error counting messages:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getThreadMessageCount:", error);
    return 0;
  }
}
