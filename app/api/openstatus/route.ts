import { NextResponse } from "next/server";

export const revalidate = 60; // cache for 1 min

const OPENSTATUS_SLUG = "zcashme";
const OPENSTATUS_API = "https://api.openstatus.dev";

async function openstatusPost(path: string, body: Record<string, unknown>) {
  const key = process.env.OPENSTATUS_API_KEY;
  if (!key) return null;

  const res = await fetch(`${OPENSTATUS_API}${path}`, {
    method: "POST",
    headers: {
      "x-openstatus-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    const [contentRes, statusRes] = await Promise.all([
      openstatusPost(
        "/openstatus.status_page.v1.StatusPage/GetStatusPageContent",
        { slug: OPENSTATUS_SLUG },
      ),
      openstatusPost(
        "/openstatus.status_page.v1.StatusPage/GetOverallStatus",
        { slug: OPENSTATUS_SLUG },
      ),
    ]);

    return NextResponse.json({
      overallStatus: statusRes?.overallStatus ?? null,
      componentStatuses: statusRes?.componentStatuses ?? [],
      statusReports: contentRes?.statusReports ?? [],
      maintenances: contentRes?.maintenances ?? [],
    });
  } catch {
    return NextResponse.json(
      { overallStatus: null, componentStatuses: [], statusReports: [], maintenances: [] },
      { status: 502 },
    );
  }
}
