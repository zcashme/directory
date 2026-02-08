import { NextRequest, NextResponse } from "next/server";
import { oneclickStatus } from "@/lib/swap/oneClick";
import type { SwapStatusData } from "@/types/swap";

interface SwapStatusErrorResponse {
  error: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<SwapStatusData | SwapStatusErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get("depositAddress");

    if (!depositAddress) {
      return NextResponse.json(
        { error: "depositAddress is required" },
        { status: 400 }
      );
    }

    const params = { depositAddress };

    const result = await oneclickStatus(params);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check swap status" },
      { status: 500 }
    );
  }
}
