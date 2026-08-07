/**
 * Express server entry point.
 * Mounts the OIDC provider and auth route handlers.
 */

import express from "express";
import { createProvider } from "./provider.js";
import { setupAuthRoutes } from "./auth/routes.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.enable("trust proxy");

const provider = createProvider();

setupAuthRoutes(app, provider);

app.use(provider.callback());

app.listen(Number(port), () => {
  const issuer = process.env.ISSUER || `http://localhost:${port}`;
  console.log(`ZcashMe Auth listening on port ${port}`);
  console.log(`Discovery: ${issuer}/.well-known/openid-configuration`);
});