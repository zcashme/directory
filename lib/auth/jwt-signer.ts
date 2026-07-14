/**
 * RS256 JWT signing — hand-rolled with Node's crypto module.
 *
 * No external JWT library. The JWT format is:
 *   base64url(header) . base64url(payload) . base64url(signature)
 *
 * RS256 = RSA signature with SHA-256. This is the OIDC spec's
 * recommended default and what every major provider uses
 * (Google, Apple, Microsoft, Clerk).
 *
 * Node's crypto module handles RSA natively — no dependency needed.
 */

import crypto from "crypto";
import { KEY_ID, SIGNING_ALG } from "./config";

// ── Key management ─────────────────────────────────────────────

/**
 * The RSA signing key pair (2048-bit).
 *
 * For production, load from env vars (PEM strings) or a KMS/HSM.
 * For development, a fresh key pair is generated on first import.
 *
 * The private key signs ID tokens. The public key is published via
 * JWKS for developers to verify tokens.
 */

let cachedKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject } | null = null;

/**
 * Load or generate the RSA key pair.
 *
 * In production, set ZCASHME_JWT_PRIVATE_KEY and ZCASHME_JWT_PUBLIC_KEY
 * as PEM strings. If not set, a fresh key pair is generated (ephemeral —
 * tokens won't survive a restart).
 */
function getKeyPair(): { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject } {
  if (cachedKeyPair) return cachedKeyPair;

  const privPem = process.env.ZCASHME_JWT_PRIVATE_KEY;
  const pubPem = process.env.ZCASHME_JWT_PUBLIC_KEY;

  if (privPem && pubPem) {
    cachedKeyPair = {
      privateKey: crypto.createPrivateKey(privPem),
      publicKey: crypto.createPublicKey(pubPem),
    };
  } else {
    // Development: generate ephemeral 2048-bit RSA key pair
    cachedKeyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
  }

  return cachedKeyPair;
}

// ── Base64url helpers ───────────────────────────────────────────

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64urlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

// ── JWT signing ─────────────────────────────────────────────────

export interface JwtClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
  nonce?: string;
  name?: string | null;
  preferred_username?: string | null;
  picture?: string | null;
  address?: string;
}

/**
 * Sign a JWT with RS256 (RSA + SHA-256).
 *
 * Returns the compact serialization: header.payload.signature
 */
export function signJwt(claims: JwtClaims): string {
  const { privateKey } = getKeyPair();

  const header = {
    alg: SIGNING_ALG,
    typ: "JWT",
    kid: KEY_ID,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // RS256: RSA signature with SHA-256
  const signature = crypto.sign("sha256", Buffer.from(signingInput, "utf8"), privateKey);
  const encodedSignature = base64url(signature);

  return `${signingInput}.${encodedSignature}`;
}

// ── JWKS ───────────────────────────────────────────────────────

/**
 * Export the public key in JWK format for the JWKS endpoint.
 *
 * Returns the standard JWKS shape:
 * { keys: [{ kty, kid, use, alg, n, e }] }
 *
 * For RSA, the JWK contains `n` (modulus) and `e` (exponent),
 * both base64url-encoded. This is what every JWT library uses
 * to verify RS256 signatures.
 */
export function getJwks(): { keys: Array<Record<string, string>> } {
  const { publicKey } = getKeyPair();
  const jwk = publicKey.export({ format: "jwk" }) as Record<string, string>;

  return {
    keys: [
      {
        ...jwk,
        kid: KEY_ID,
        use: "sig",
        alg: SIGNING_ALG,
      },
    ],
  };
}

// ── JWT verification (for internal use — developers verify with their own libs) ──

/**
 * Verify a JWT signature. Used internally if we need to verify our own
 * tokens (e.g., refresh token validation). Developers use their own
 * libraries (jose, jsonwebtoken, etc.) with our public key from JWKS.
 */
export function verifyJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = base64urlDecode(encodedSignature);

    const { publicKey } = getKeyPair();
    const valid = crypto.verify("sha256", Buffer.from(signingInput, "utf8"), publicKey, signature);
    if (!valid) return null;

    const payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
    return payload as JwtClaims;
  } catch {
    return null;
  }
}