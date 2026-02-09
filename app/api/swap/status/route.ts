import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSwapStatus } from "@/lib/swap/oneclick";
import type { SwapStatusData } from "@/lib/swap/types";

interface SwapStatusErrorResponse {
  error: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<SwapStatusData | SwapStatusErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get("depositAddress");
    const depositMemo = searchParams.get("depositMemo");

    if (!depositAddress) {
      return NextResponse.json(
        { error: "depositAddress is required" },
        { status: 400 }
      );
    }

    const result = await getSwapStatus(depositAddress, depositMemo || undefined);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to check swap status" },
      { status: 500 }
    );
  }
}
