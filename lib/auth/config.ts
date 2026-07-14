/**
 * OIDC configuration for ZcashMe Auth.
 *
 * These are the constants that define the OIDC provider's behavior.
 * They're consumed by the discovery endpoint, the token endpoint,
 * and the authorize page.
 */

export const ISSUER = "https://zcash.me";

export const AUTH_SCOPES = ["openid", "profile"] as const;

export const TOKEN_LIFETIMES = {
  idToken: 5 * 60,          // 5 minutes (seconds)
  accessToken: 60 * 60,     // 1 hour
  refreshToken: 30 * 24 * 60 * 60, // 30 days
  authCode: 10 * 60,        // 10 minutes
  authSession: 5 * 60,      // 5 minutes (authorize page session)
} as const;

export const SIGNING_ALG = "RS256";
export const KEY_ID = "zme-2026-01";

/**
 * The Zcash service address that users send auth payments to.
 * This is the same address used by the existing ZVS verification flow.
 */
export const SERVICE_ADDRESS =
  "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u";

/** Minimum payment in ZEC to trigger an OTP response. */
export const MIN_PAYMENT_ZEC = "0.002";

/**
 * Claims supported by ZcashMe Auth.
 * `sub` is always the Zcash address. Profile claims come from the
 * ZcashMe directory / ZNS.
 */
export const SUPPORTED_CLAIMS = [
  "sub",
  "iss",
  "aud",
  "exp",
  "iat",
  "auth_time",
  "nonce",
  "name",
  "preferred_username",
  "picture",
  "address",
] as const;

/** Discovery document shape. */
export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported: string[];
  claims_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  require_pkce: boolean;
}