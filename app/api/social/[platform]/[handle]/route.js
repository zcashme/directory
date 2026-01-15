import { lookupSocialAddress } from "../../../../../lib/social-lookup";

export async function GET(request, { params }) {
  const platform = params?.platform || "";
  const handle = params?.handle || "";
  const result = await lookupSocialAddress(platform, handle);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=300",
    },
  });
}
