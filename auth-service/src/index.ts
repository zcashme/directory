/**
 * Entry point — starts the Express server, mounts oidc-provider
 * and the interaction routes.
 *
 * This is the only file that calls app.listen(). Everything else
 * is imported and wired together here.
 */

import express from "express";
import { createProvider } from "./provider.js";
import { setupInteraction } from "./interaction.js";

const app = express();
const port = process.env.PORT || 3001;

// Parse JSON bodies (for interaction API endpoints)
app.use(express.json());

// Trust Vercel's TLS-terminating proxy (X-Forwarded-Proto)
app.enable("trust proxy");

const provider = createProvider();

// Interaction routes (login page + API) — must be before provider.callback()
setupInteraction(app, provider);

// Mount oidc-provider (handles /auth, /token, /me, /jwks, /.well-known, etc.)
app.use(provider.callback());

app.listen(Number(port), () => {
  const issuer = process.env.ISSUER || `http://localhost:${port}`;
  console.log(`ZcashMe Auth listening on port ${port}`);
  console.log(`Discovery: ${issuer}/.well-known/openid-configuration`);
});