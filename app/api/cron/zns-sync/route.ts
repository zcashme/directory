import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api/guard";
import { syncZnsRegistry } from "@/lib/zns/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const result = await syncZnsRegistry();
  return jsonResponse(result, result.ok ? 200 : 503);
}
