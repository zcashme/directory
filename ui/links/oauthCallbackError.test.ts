import assert from "node:assert/strict";
import test from "node:test";
import { getOAuthCallbackError } from "./oauthCallbackError.ts";

test("reads a Supabase callback error from the URL fragment", () => {
  assert.equal(
    getOAuthCallbackError("", "#error=server_error&error_description=Email+is+required"),
    "Email is required",
  );
});

test("reads a Supabase callback error from the query string", () => {
  assert.equal(
    getOAuthCallbackError("?error_description=Redirect+URL+not+allowed", ""),
    "Redirect URL not allowed",
  );
});

test("uses the error code when no description is supplied", () => {
  assert.equal(
    getOAuthCallbackError("?error_code=provider_error", ""),
    "Authentication callback error: provider_error",
  );
});
