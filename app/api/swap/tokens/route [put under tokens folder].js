import { oneclickTokens } from "../../../../lib/oneClick";

export async function GET() {
  try {
    const data = await oneclickTokens();
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
