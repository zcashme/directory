import { NextRequest, NextResponse } from "next/server";
import { ZNS } from "zcashname-sdk";

const zns = new ZNS({ url: process.env.ZNS_RPC_URL });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name || name.length < 1) {
      return NextResponse.json(
        { error: "invalid_name", message: "Name is required" },
        { status: 400 }
      );
    }

    const result = await zns.resolveName(name);

    if (!result) {
      return NextResponse.json(
        { error: "not_found", message: `Name '${name}' is not registered` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        name: result.name,
        address: result.address,
        txid: result.txid,
        height: result.height,
        nonce: result.nonce,
        last_action: result.last_action,
        pubkey: result.pubkey ?? null,
        listing: result.listing
          ? {
              price: result.listing.price,
              txid: result.listing.txid,
              height: result.listing.height,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[ZNS] Error resolving name:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to resolve name" },
      { status: 500 }
    );
  }
}
