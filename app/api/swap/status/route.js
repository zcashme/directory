import { oneclickStatus } from "../../../../lib/oneClick";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const depositAddress = searchParams.get("depositAddress");
    const depositMemo = searchParams.get("depositMemo");

    if (!depositAddress) {
      return Response.json({ ok: false, error: "Missing depositAddress", retryable: true }, { status: 200 });
    }

    const params = { depositAddress };
    if (depositMemo) params.depositMemo = depositMemo;

    const status = await oneclickStatus(params);
    return Response.json({ ok: true, status });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e), retryable: true }, { status: 200 });
  }
}
