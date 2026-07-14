import { NextRequest, NextResponse } from "next/server";
import { consumeAuthCode } from "@/lib/auth/session-store";
import { signJwt } from "@/lib/auth/jwt-signer";
import { ISSUER, TOKEN_LIFETIMES } from "@/lib/auth/config";

/**
 * Token Endpoint — POST /auth/token
 *
 * Exchanges an authorization code for an ID token (signed JWT),
 * an access token, and a refresh token.
 *
 * The developer's OIDC library calls this automatically after
 * receiving the authorization code at their callback URL.
 *
 * PKCE is verified: SHA256(code_verifier) must match the stored
 * code_challenge from the authorize request.
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let body: Record<string, string>;
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      body = await request.json();
    }

    const grantType = body.grant_type;

    // ── Authorization Code grant ──────────────────────────────

    if (grantType === "authorization_code") {
      const code = body.code;
      const codeVerifier = body.code_verifier;
      const clientId = body.client_id;
      const redirectUri = body.redirect_uri;

      if (!code || !codeVerifier || !clientId) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Missing required parameters." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      // Exchange the code (verifies PKCE, single-use)
      const entry = consumeAuthCode(code, codeVerifier);
      if (!entry) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid or expired code." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      // Verify client_id matches
      if (entry.clientId !== clientId) {
        return NextResponse.json(
          { error: "invalid_client", error_description: "Client ID mismatch." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      // Verify redirect_uri matches
      if (redirectUri && entry.redirectUri !== redirectUri) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Redirect URI mismatch." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      // Sign the ID token
      const now = Math.floor(Date.now() / 1000);
      const idToken = signJwt({
        iss: ISSUER,
        sub: entry.address,
        aud: entry.clientId,
        exp: now + TOKEN_LIFETIMES.idToken,
        iat: now,
        auth_time: Math.floor(entry.authenticatedAt / 1000),
        nonce: entry.nonce || undefined,
        name: entry.znsName || null,
        preferred_username: entry.znsName || null,
        picture: entry.picture || null,
        address: entry.address,
      });

      // Generate opaque access token (for userinfo endpoint)
      const accessToken = crypto.randomUUID();
      // For MVP, we store the access token in-memory mapped to the session data
      // In production, this would be in Supabase or Redis
      // The userinfo endpoint will look up the access token to return profile data
      // For now, we embed the address in the access token response

      // Generate refresh token (for silent session renewal)
      const refreshToken = crypto.randomUUID();

      return NextResponse.json(
        {
          id_token: idToken,
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: TOKEN_LIFETIMES.accessToken,
          refresh_token: refreshToken,
          scope: entry.scope,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // ── Refresh token grant ───────────────────────────────────

    if (grantType === "refresh_token") {
      // TODO: implement refresh token rotation
      // For MVP, return an error — refresh will be added when we
      // move the session store to Supabase
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Refresh tokens not yet supported." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: `Grant type ${grantType} not supported.` },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}