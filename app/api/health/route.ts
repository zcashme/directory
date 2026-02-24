import { NextResponse } from "next/server";

export const revalidate = 600; // cache GET for 10 minutes

/* ------------------------------------------------------------------ */
/*  Shared health-check logic                                          */
/* ------------------------------------------------------------------ */

type ServiceResult = { status: "ok" | "down"; latency_ms: number };

async function checkServices() {
  const results: Record<string, ServiceResult> = {};

  // Check Directory (Supabase)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const start = Date.now();
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/zcasher?select=id&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      results.directory = {
        status: res.ok ? "ok" : "down",
        latency_ms: Date.now() - start,
      };
    } catch {
      results.directory = { status: "down", latency_ms: Date.now() - start };
    }
  }

  // Check Verifications (ZVS)
  {
    const start = Date.now();
    try {
      const res = await fetch("http://151.115.100.10:8080", {
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.json();
      results.verifications = {
        status: body.status === "ok" ? "ok" : "down",
        latency_ms: Date.now() - start,
      };
    } catch {
      results.verifications = { status: "down", latency_ms: Date.now() - start };
    }
  }

  // App is up if this endpoint responds
  results.zcashme = { status: "ok", latency_ms: 0 };

  return results;
}

/* ------------------------------------------------------------------ */
/*  GET — public read endpoint (cached 10 min)                         */
/* ------------------------------------------------------------------ */

export async function GET() {
  const results = await checkServices();
  const allHealthy = Object.values(results).every((r) => r.status === "ok");

  return NextResponse.json(
    { status: allHealthy ? "ok" : "degraded", services: results },
    { status: allHealthy ? 200 : 503 }
  );
}
