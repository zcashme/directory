import { NextRequest, NextResponse } from "next/server";
import { ZNS } from "zcashname-sdk";

const zns = new ZNS({ url: process.env.ZNS_RPC_URL });

export async function GET(request: NextRequest) {
  try {
    const status = await zns.status();

    return NextResponse.json(
      {
        synced_height: status.synced_height,
        registered: status.registered,
        listed: status.listed,
        uivk: status.uivk,
        admin_pubkey: status.admin_pubkey,
        address: status.address,
        pricing: status.pricing
          ? {
              nonce: status.pricing.nonce,
              height: status.pricing.height,
              tiers: status.pricing.tiers,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("[ZNS] Error fetching status:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch indexer status" },
      { status: 500 }
    );
  }
}
