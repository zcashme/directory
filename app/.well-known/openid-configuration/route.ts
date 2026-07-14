import { NextResponse } from "next/server";
import { ISSUER, AUTH_SCOPES, SUPPORTED_CLAIMS, SIGNING_ALG } from "@/lib/auth/config";
import type { DiscoveryDocument } from "@/lib/auth/config";

/**
 * OIDC Discovery — GET /.well-known/openid-configuration
 *
 * Returns the provider metadata. OIDC client libraries (NextAuth,
 * Better Auth, Clerk, etc.) read this to auto-discover all endpoints,
 * supported scopes, signing algorithms, and claims.
 */

export async function GET(): Promise<Response> {
  const doc: DiscoveryDocument = {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/auth/authorize`,
    token_endpoint: `${ISSUER}/auth/token`,
    userinfo_endpoint: `${ISSUER}/auth/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    end_session_endpoint: `${ISSUER}/auth/logout`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [SIGNING_ALG],
    scopes_supported: [...AUTH_SCOPES],
    claims_supported: [...SUPPORTED_CLAIMS],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    require_pkce: true,
  };

  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}