import { NextResponse } from "next/server";

export const revalidate = 60; // cache for 1 min

const OPENSTATUS_SLUG = "zcashme";
const OPENSTATUS_API = "https://api.openstatus.dev";

export async function GET() {
  try {
    const res = await fetch(
      `${OPENSTATUS_API}/public/status/${OPENSTATUS_SLUG}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) {
      return NextResponse.json(
        { overallStatus: null, statusReports: [], maintenances: [] },
        { status: 502 },
      );
    }

    const data = await res.json();

    // The public API returns { status: "operational" | "degraded_performance" | ... }
    // Map to the format the frontend expects
    const statusMap: Record<string, string> = {
      operational: "OPERATIONAL",
      degraded_performance: "DEGRADED",
      partial_outage: "PARTIAL_OUTAGE",
      major_outage: "MAJOR_OUTAGE",
      under_maintenance: "MAINTENANCE",
      unknown: "UNKNOWN",
      incident: "PARTIAL_OUTAGE",
    };

    return NextResponse.json({
      overallStatus: statusMap[data.status] ?? "UNKNOWN",
      statusReports: [],
      maintenances: [],
    });
  } catch {
    return NextResponse.json(
      { overallStatus: null, statusReports: [], maintenances: [] },
      { status: 502 },
    );
  }
}
