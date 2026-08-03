/**
 * oidc-provider configuration.
 *
 * This is the heart of the auth service — it defines the issuer, clients,
 * signing keys, token lifetimes, PKCE policy, and which features are enabled.
 * oidc-provider handles all OIDC protocol (discovery, JWKS, token endpoint,
 * PKCE verification, refresh tokens, JWT signing) automatically.
 */

import Provider from "oidc-provider";
import SupabaseAdapter from "./adapter.js";
import { findAccount } from "./account.js";

const issuer = process.env.ISSUER || `http://localhost:${process.env.PORT || 3001}`;

/** Load RSA signing key from env var (JWK JSON). Required — throws at startup if missing or invalid. */
function getJwks() {
  const raw = process.env.JWKS_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "JWKS_PRIVATE_KEY is not set. Generate one with:\n" +
      "  node -e \"const c=require('crypto');const k=c.generateKeyPairSync('rsa',{modulusLength:2048});console.log(JSON.stringify({keys:[k.privateKey.export({format:'jwk'})]}))\"\n" +
      "Then add it to your .env file."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("JWKS_PRIVATE_KEY is not valid JSON — check your .env or Vercel env var.");
  }
}

export function createProvider() {
  const provider = new Provider(issuer, {
    // ── Storage ──────────────────────────────────────────────
    adapter: SupabaseAdapter,

    // ── Signing keys ─────────────────────────────────────────
    jwks: getJwks(),



    // ── Registered clients (loaded dynamically from database) ──
    clients: [],

    // ── Account lookup ───────────────────────────────────────
    findAccount,

    // ── Interaction URL (where to send users for login) ──────
    interactions: {
      url(_ctx: any, interaction: any) {
        return `/interaction/${interaction.uid}`;
      },
    },

    // ── PKCE required for all clients ───────────────────────
    pkce: {
      required() {
        return true;
      },
    },

    // ── Claims available per scope ───────────────────────────
    claims: {
      openid: ["sub"],
      profile: ["name", "preferred_username", "picture", "zcash_address"],
    },

    // ── Supported scopes ─────────────────────────────────────
    scopes: ["openid", "offline_access", "profile"],

    // ── Token lifetimes (seconds) ───────────────────────────
    ttl: {
      AccessToken: 60 * 60,             // 1 hour
      AuthorizationCode: 10 * 60,       // 10 minutes
      IdToken: 5 * 60,                  // 5 minutes
      RefreshToken: 30 * 24 * 60 * 60,  // 30 days
      Interaction: 10 * 60,             // 10 minutes
      Session: 14 * 24 * 60 * 60,       // 14 days
      Grant: 14 * 24 * 60 * 60,         // 14 days
    },

    // ── Features ────────────────────────────────────────────
    features: {
      devInteractions: { enabled: false },   // MUST disable in production
      userinfo: { enabled: true },
      rpInitiatedLogout: { enabled: true },
      revocation: { enabled: true },
    },

    // ── Cookies ─────────────────────────────────────────────
    cookies: {
      long: { httpOnly: true, sameSite: "lax" },
      short: { httpOnly: true, sameSite: "lax" },
    },
  } as any);

  // Trust Vercel's TLS-terminating proxy (X-Forwarded-Proto)
  provider.proxy = true;

  return provider;
}