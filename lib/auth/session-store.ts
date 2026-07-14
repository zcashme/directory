/**
 * Authorization session store — tracks OIDC authorize sessions and
 * issued authorization codes.
 *
 * For MVP, in-memory. For production, move to Supabase (survives
 * restarts, works across instances).
 *
 * Two stores:
 * 1. Auth sessions — created when user visits /auth/authorize
 * 2. Authorization codes — created when OTP is verified
 *
 * The flow:
 *   authorize → create auth session → user authenticates →
 *   OTP verified → create auth code → redirect back →
 *   developer exchanges code at /auth/token → delete code
 */

import { generateAuthCode, generateRandomString } from "./pkce";

export interface AuthSession {
  /** Internal session ID (random, not the ZVS session ID) */
  id: string;
  /** OIDC client_id */
  clientId: string;
  /** Redirect URI (where to send the user after auth) */
  redirectUri: string;
  /** OAuth state (CSRF protection, passed through) */
  state: string;
  /** OIDC nonce (replay protection, goes in JWT) */
  nonce: string;
  /** PKCE code challenge */
  codeChallenge: string;
  /** PKCE challenge method */
  codeChallengeMethod: string;
  /** Requested scopes */
  scope: string;
  /** Expiry timestamp (ms) */
  expiresAt: number;
  /** Status */
  status: "pending" | "authenticated" | "expired";
  /** User's Zcash address (filled after OTP verification) */
  address?: string;
  /** ZNS name (filled after resolution) */
  znsName?: string;
  /** Profile picture URL (filled after resolution) */
  picture?: string;
  /** When the user authenticated (ms, for JWT auth_time) */
  authenticatedAt?: number;
  /** Issued authorization code (filled after OTP verification) */
  authCode?: string;
}

export interface AuthCodeEntry {
  /** The authorization code */
  code: string;
  /** Reference to the auth session */
  sessionId: string;
  /** User's Zcash address */
  address: string;
  /** Client ID */
  clientId: string;
  /** Redirect URI */
  redirectUri: string;
  /** Nonce (for JWT) */
  nonce: string;
  /** PKCE challenge */
  codeChallenge: string;
  /** PKCE method */
  codeChallengeMethod: string;
  /** Scope */
  scope: string;
  /** ZNS name */
  znsName?: string;
  /** Profile picture */
  picture?: string;
  /** Expiry timestamp (ms) */
  expiresAt: number;
  /** Auth time (ms, for JWT auth_time) */
  authenticatedAt: number;
}

// ── In-memory stores ────────────────────────────────────────────

const authSessions = new Map<string, AuthSession>();
const authCodes = new Map<string, AuthCodeEntry>();

// Cleanup expired entries every 2 minutes
const CLEANUP_INTERVAL = 2 * 60 * 1000;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, session] of authSessions) {
    if (session.expiresAt < now) {
      authSessions.delete(id);
    }
  }
  for (const [code, entry] of authCodes) {
    if (entry.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}

// Start cleanup timer (only in non-edge runtime)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpired, CLEANUP_INTERVAL);
}

// ── Auth session operations ─────────────────────────────────────

/**
 * Create a new auth session when a user visits /auth/authorize.
 */
export function createAuthSession(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}): AuthSession {
  const session: AuthSession = {
    id: generateRandomString(32),
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    state: params.state,
    nonce: params.nonce,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    scope: params.scope,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    status: "pending",
  };

  authSessions.set(session.id, session);
  return session;
}

/**
 * Get an auth session by ID.
 */
export function getAuthSession(id: string): AuthSession | null {
  const session = authSessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    authSessions.delete(id);
    return null;
  }
  return session;
}

/**
 * Mark a session as authenticated with the user's Zcash address.
 * Called after OTP verification succeeds.
 */
export function completeAuthSession(
  sessionId: string,
  address: string,
  znsName?: string,
  picture?: string,
): AuthSession | null {
  const session = authSessions.get(sessionId);
  if (!session) return null;

  session.address = address;
  session.znsName = znsName;
  session.picture = picture;
  session.status = "authenticated";
  session.authenticatedAt = Date.now();

  return session;
}

/**
 * Issue an authorization code for an authenticated session.
 * Returns the code and the redirect URL.
 */
export function issueAuthCode(sessionId: string): {
  code: string;
  redirectUrl: string;
} | null {
  const session = authSessions.get(sessionId);
  if (!session || session.status !== "authenticated" || !session.address) {
    return null;
  }

  const code = generateAuthCode();

  const entry: AuthCodeEntry = {
    code,
    sessionId: session.id,
    address: session.address,
    clientId: session.clientId,
    redirectUri: session.redirectUri,
    nonce: session.nonce,
    codeChallenge: session.codeChallenge,
    codeChallengeMethod: session.codeChallengeMethod,
    scope: session.scope,
    znsName: session.znsName,
    picture: session.picture,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    authenticatedAt: session.authenticatedAt ?? Date.now(),
  };

  authCodes.set(code, entry);

  // Build the redirect URL
  const url = new URL(session.redirectUri);
  url.searchParams.set("code", code);
  if (session.state) {
    url.searchParams.set("state", session.state);
  }

  // Clean up the auth session (the code is now the reference)
  authSessions.delete(sessionId);

  return { code, redirectUrl: url.toString() };
}

// ── Authorization code operations ───────────────────────────────

/**
 * Exchange an authorization code for the session data.
 * The code is deleted (single-use).
 */
export function consumeAuthCode(
  code: string,
  codeVerifier: string,
): AuthCodeEntry | null {
  const entry = authCodes.get(code);
  if (!entry) return null;

  // Check expiry
  if (entry.expiresAt < Date.now()) {
    authCodes.delete(code);
    return null;
  }

  // Verify PKCE
  // The code_verifier is hashed and compared to the stored code_challenge
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(codeVerifier, "utf8").digest();
  const computed = hash.toString("base64url");

  if (computed !== entry.codeChallenge) {
    return null; // PKCE verification failed
  }

  // Single-use: delete after successful exchange
  authCodes.delete(code);
  return entry;
}