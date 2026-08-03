/**
 * Seed an OIDC client into the zm_auth_clients table.
 *
 * Usage: pnpm tsx seed-client.ts
 */

import { supabase } from "./src/supabase.js";

async function main() {
  console.log("Seeding pgpz client into the database...");

  const { error } = await supabase.from("zm_auth_clients").upsert({
    id: "pgpz",
    name: "PGPZ Community",
    payload: {
      client_id: "pgpz",
      client_name: "PGPZ Community",
      redirect_uris: [
        "https://community.pgpforcrypto.org/api/auth/callback/zcashme",
        "http://localhost:3000/api/auth/callback/zcashme",
      ],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // PKCE only
    },
  }, { onConflict: "id" });

  if (error) {
    console.error("Error seeding client:", error.message);
    process.exit(1);
  }

  console.log("Success! pgpz client is now registered in zm_auth_clients.");
}

main().catch(e => console.error("Error:", e));