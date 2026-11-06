const MAX_CALLBACK_ERROR_LENGTH = 300;

/**
 * Supabase returns failed OAuth callback details in either the query string or
 * URL fragment. Keep the provider's actionable description for the affected
 * link instead of replacing it with a generic missing-session message.
 */
export function getOAuthCallbackError(search: string, hash: string): string | null {
  for (const value of [search, hash]) {
    const params = new URLSearchParams(value.replace(/^[?#]/, ""));
    const description = params.get("error_description") ?? params.get("error");
    if (description?.trim()) return description.trim().slice(0, MAX_CALLBACK_ERROR_LENGTH);

    const code = params.get("error_code");
    if (code?.trim()) return `Authentication callback error: ${code.trim().slice(0, MAX_CALLBACK_ERROR_LENGTH)}`;
  }
  return null;
}
