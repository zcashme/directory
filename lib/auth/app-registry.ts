/**
 * App registry — maps client_id to registered app configuration.
 *
 * For MVP, apps are registered manually (hardcoded or env var).
 * For production, this should be a Supabase table managed via a
 * dashboard.
 */

export interface RegisteredApp {
  client_id: string;
  name: string;
  redirect_uris: string[];
  // No client_secret — we use PKCE
}

/**
 * Registered apps. For now, hardcoded. To add a new app, add it here
 * or move to Supabase.
 *
 * In production, this would be a Supabase table:
 *   oidc_apps (client_id TEXT PK, name TEXT, redirect_uris JSONB, created_at TIMESTAMPTZ)
 */
const REGISTERED_APPS: Record<string, RegisteredApp> = {
  // Example: the PGPZ community app
  pgpz: {
    client_id: "pgpz",
    name: "PGPZ Community",
    redirect_uris: [
      "https://community.pgpforcrypto.org/api/auth/callback/zcashme",
      "http://localhost:3000/api/auth/callback/zcashme",
    ],
  },
};

/**
 * Look up a registered app by client_id.
 */
export function getApp(clientId: string): RegisteredApp | null {
  return REGISTERED_APPS[clientId] ?? null;
}

/**
 * Validate that a redirect_uri is registered for the given client_id.
 */
export function isValidRedirectUri(clientId: string, redirectUri: string): boolean {
  const app = getApp(clientId);
  if (!app) return false;
  return app.redirect_uris.includes(redirectUri);
}