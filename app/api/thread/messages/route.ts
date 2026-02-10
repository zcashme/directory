/**
 * API endpoint for fetching public thread messages
 * GET /api/thread/messages
 *
 * Query params:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - user_id: number (optional, filter by user)
 */

import { NextRequest, NextResponse } from "next/server";
import { getThreadMessages, getThreadMessagesByUser } from "@/lib/thread/getMessages";
import { FetchThreadMessagesResponse } from "@/lib/thread/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    let limit = parseInt(searchParams.get("limit") || "50");
    let offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("user_id");

    // Validate and clamp limits
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100; // Max 100 messages per request

    if (isNaN(offset) || offset < 0) offset = 0;

    let messages;

    if (userId) {
      // Fetch messages from specific user
      const zcasherId = parseInt(userId);
      if (isNaN(zcasherId) || zcasherId <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid user_id parameter",
          } as FetchThreadMessagesResponse,
          { status: 400 }
        );
      }

      messages = await getThreadMessagesByUser(zcasherId, limit, offset);
    } else {
      // Fetch all public messages
      messages = await getThreadMessages(limit, offset);
    }

    return NextResponse.json(
      {
        ok: true,
        data: messages,
      } as FetchThreadMessagesResponse,
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30", // Cache for 30 seconds
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/thread/messages:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      } as FetchThreadMessagesResponse,
      { status: 500 }
    );
  }
}
