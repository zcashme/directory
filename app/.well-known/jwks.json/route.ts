import { NextResponse } from "next/server";
import { getJwks } from "@/lib/auth/jwt-signer";

/**
 * JWKS Endpoint — GET /.well-known/jwks.json
 *
 * Returns the public signing key(s) in JWK format. Developers
 * use these to verify the signature on ID tokens we issue.
 *
 * Supports key rotation via the `kid` (key ID) field — if we
 * rotate keys, we publish multiple keys here and old tokens
 * remain verifiable until the old key is removed.
 */

export async function GET(): Promise<Response> {
  const jwks = getJwks();

  return NextResponse.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}