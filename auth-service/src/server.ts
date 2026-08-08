/**
 * Express server entry point.
 * Mounts the OIDC provider and auth route handlers.
 * Serves the built React app from public/.
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProvider } from "./provider.js";
import { setupAuthRoutes } from "./auth/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.enable("trust proxy");

// Serve built React app
app.use(express.static(path.join(__dirname, "..", "public")));

const provider = createProvider();

setupAuthRoutes(app, provider);

app.use(provider.callback());

app.listen(Number(port), () => {
  const issuer = process.env.ISSUER || `http://localhost:${port}`;
  console.log(`ZcashMe Auth listening on port ${port}`);
  console.log(`Discovery: ${issuer}/.well-known/openid-configuration`);
});