import { redirect } from "next/navigation";
import { getApp, isValidRedirectUri } from "@/lib/auth/app-registry";
import { createAuthSession } from "@/lib/auth/session-store";
import AuthorizeClient from "./AuthorizeClient";

/**
 * OIDC Authorization Endpoint — GET /auth/authorize
 *
 * This is the hosted login page. The developer's app redirects
 * the user here with standard OAuth2/OIDC parameters. We validate
 * them, create an auth session, and render the login UI.
 *
 * After the user authenticates (QR + payment + OTP), we redirect
 * back to the developer's callback URL with an authorization code.
 */

interface AuthorizePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return (value ?? "").trim();
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams;

  // Extract OIDC parameters
  const clientId = getParam(params, "client_id");
  const redirectUri = getParam(params, "redirect_uri");
  const responseType = getParam(params, "response_type");
  const scope = getParam(params, "scope");
  const state = getParam(params, "state");
  const nonce = getParam(params, "nonce");
  const codeChallenge = getParam(params, "code_challenge");
  const codeChallengeMethod = getParam(params, "code_challenge_method");

  // Validate required parameters
  if (!clientId) {
    return <ErrorCard message="Missing client_id parameter." />;
  }

  // Validate client_id is registered
  const app = getApp(clientId);
  if (!app) {
    return <ErrorCard message={`Unknown application: ${clientId}`} />;
  }

  // Validate response_type (we only support authorization code flow)
  if (responseType !== "code") {
    return <ErrorCard message="Only response_type=code is supported." />;
  }

  // Validate redirect_uri is registered for this client
  if (!redirectUri || !isValidRedirectUri(clientId, redirectUri)) {
    return <ErrorCard message="Invalid redirect_uri." />;
  }

  // Validate scope contains openid
  if (!scope.includes("openid")) {
    return <ErrorCard message="Scope must include 'openid'." />;
  }

  // Validate PKCE parameters
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return <ErrorCard message="PKCE with S256 is required." />;
  }

  // Create the auth session
  const session = createAuthSession({
    clientId,
    redirectUri,
    state,
    nonce,
    codeChallenge,
    codeChallengeMethod,
    scope,
  });

  // Render the login UI
  return <AuthorizeClient sessionId={session.id} appName={app.name} />;
}

/**
 * Error card for invalid authorize requests.
 * We don't redirect back to the developer's app for these errors —
 * they indicate a misconfigured integration, not a user error.
 */
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-red-900 mb-2">
          Authorization Error
        </h1>
        <p className="text-sm text-red-700">{message}</p>
        <p className="text-xs text-red-500 mt-4">
          Contact the application developer if this persists.
        </p>
      </div>
    </div>
  );
}