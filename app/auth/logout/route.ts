import { NextRequest, NextResponse } from "next/server";

/**
 * End Session Endpoint — GET /auth/logout
 *
 * RP-initiated logout. Clears the ZcashMe auth session and
 * redirects back to the developer's post-logout redirect URI.
 *
 * For MVP, this is a simple redirect. In production, this would
 * also clear any server-side session state.
 */

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const postLogoutUri = params.get("post_logout_redirect_uri");

  if (postLogoutUri) {
    return NextResponse.redirect(postLogoutUri);
  }

  // No redirect URI — show a simple "signed out" page
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Signed out</title></head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center;">
    <h1>Signed out</h1>
    <p>You have been signed out.</p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    },
  );
}