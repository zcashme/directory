import { oneclickStatus } from "@/lib/swap/oneClick";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get("depositAddress");
    const depositMemo = searchParams.get("depositMemo");

    if (!depositAddress) {
      return Response.json(
        { error: "depositAddress is required" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Checking swap status for: ${depositAddress.slice(0, 10)}...`
    );

    const params = { depositAddress };
    if (depositMemo) {
      params.depositMemo = depositMemo;
    }

    const result = await oneclickStatus(params);
    console.log(`[API] Status result:`, result);

    return Response.json(result);
  } catch (error) {
    console.error("[API] Swap status error:", error);
    return Response.json(
      { error: "Failed to check swap status" },
      { status: 500 }
    );
  }
}
