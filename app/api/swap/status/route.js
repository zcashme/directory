import { oneclickStatus } from "@/lib/swap/oneClick";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get("depositAddress");

    if (!depositAddress) {
      return Response.json(
        { error: "depositAddress is required" },
        { status: 400 }
      );
    }

    const params = { depositAddress };

    const result = await oneclickStatus(params);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: "Failed to check swap status" },
      { status: 500 }
    );
  }
}
