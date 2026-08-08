/**
 * Auth route handlers — thin controllers.
 * 2 endpoints: GET (page), POST (resolve + verify + abort).
 */

import type { Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { resolveName, loadLinks } from "../profile/lookup.js";
import { applyProfileChanges } from "../profile/write.js";
import { generateSessionId, buildZvsMemo, buildZcashUri, parseZvsMemo, SERVICE_ADDRESS, MIN_PAYMENT_ZEC } from "../zvs/memo.js";
import { verifyOtp } from "../zvs/otp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupAuthRoutes(app: Express, provider: any) {
  // ── GET /demo — serve the React app without OIDC session ──
  app.get("/demo", (req, res) => {
    return res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
  });

  // ── POST /demo — demo endpoints (mock resolve/verify) ──
  app.post("/demo", async (req, res) => {
    const action = req.body?.action;

    if (action === "resolve") {
      const name = (req.body?.name ?? "").trim();
      if (!name) return res.json({ error: "Name is required" });
      const result = await resolveName(name);
      if (!result?.address) return res.json({ error: "Name not found" });

      const sessionId = generateSessionId(16);
      const memo = buildZvsMemo(sessionId, result.address);
      const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);
      const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });

      return res.json({
        address: result.address,
        name: result.name,
        display_name: result.display_name,
        bio: result.bio,
        profile_image_url: result.profile_image_url,
        nearest_city_name: result.nearest_city_name,
        address_verified: result.address_verified,
        id: result.id,
        links: result.id ? await loadLinks(result.id) : [],
        memo,
        qr,
      });
    }

    if (action === "verify") {
      const otp = (req.body?.otp ?? "").trim();
      const memo = (req.body?.memo ?? "").trim();
      if (!otp || !memo) return res.status(400).send("Missing fields");

      const valid = await verifyOtp(memo, otp);
      if (!valid) return res.status(400).send("Invalid verification code.");
      
      // Demo succeeds without writing to DB or returning OIDC grant
      return res.json({ ok: true, isDemo: true });
    }

    return res.status(400).send("Invalid action");
  });

  // ── GET /interaction/:uid — serve the login page ──────────
  app.get("/interaction/:uid", async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);

      if (details.prompt.name === "none") {
        return provider.interactionFinished(req, res, {
          error: "login_required",
          error_description: "End-User is not logged in",
        });
      }

      const client = await provider.Client.find(details.params.client_id);
      const appName = client?.clientName ?? client?.clientId ?? "Unknown App";
      const appUri = client?.clientUri ?? "";
      const userId = details.params.user_id as string | undefined;

      // Serve the React app — it reads uid from the URL path
      return res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
    } catch {
      res.status(400).send("<h1>Session expired</h1><p>Please restart the login.</p>");
    }
  });

  // ── POST /interaction/:uid — one endpoint, action-based ──
  //    action=resolve → resolve username + generate QR (session-validated)
  //    action=verify  → verify OTP + write profile + create grant
  //    action=abort   → cancel and redirect back to client with access_denied
  app.post("/interaction/:uid", async (req, res) => {
    const action = req.body?.action;

    // ── action=abort: cancel the interaction ───────────────
    if (action === "abort") {
      try {
        return provider.interactionFinished(req, res, {
          error: "access_denied",
          error_description: "End-User aborted interaction",
        });
      } catch {
        return res.redirect("/");
      }
    }

    // ── action=resolve: resolve username + generate QR ──────
    // Server resolves the name, gets the address, generates the memo,
    // and returns everything in one response. No address round-trip.
    if (action === "resolve") {
      // Validate the interaction session first
      try {
        await provider.interactionDetails(req, res);
      } catch {
        return res.status(403).json({ error: "Session expired" });
      }

      const name = (req.body?.name ?? "").trim();
      if (!name) return res.json({ error: "Name is required" });

      const result = await resolveName(name);
      if (!result?.address) return res.json({ error: "Name not found" });

      // Generate memo + QR in the same response — no second round trip
      const sessionId = generateSessionId(16);
      const memo = buildZvsMemo(sessionId, result.address);
      const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);
      const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });

      return res.json({
        address: result.address,
        name: result.name,
        display_name: result.display_name,
        bio: result.bio,
        profile_image_url: result.profile_image_url,
        nearest_city_name: result.nearest_city_name,
        address_verified: result.address_verified,
        id: result.id,
        links: result.id ? await loadLinks(result.id) : [],
        memo,
        qr,
      });
    }

    // ── action=verify: verify OTP + create grant ───────────
    if (action === "verify") {
      const otp = (req.body?.otp ?? "").trim();
      const memo = (req.body?.memo ?? "").trim();

      if (!otp || !memo) {
        return res.status(400).send("Missing fields");
      }

      const parsed = parseZvsMemo(memo);
      if (!parsed) {
        return res.status(400).send("Invalid memo format.");
      }
      const verifiedAddress = parsed.userAddress;

      const valid = await verifyOtp(memo, otp);
      if (!valid) {
        return res.status(400).send("Invalid verification code. Please go back and try again.");
      }

      // Apply profile changes if provided
      const profileEdits = req.body?.profile_edits;
      if (profileEdits) {
        try {
          const edits = typeof profileEdits === "string" ? JSON.parse(profileEdits) : profileEdits;

          // Add the app link from interaction params (server-enforced, not client-controlled)
          const details = await provider.interactionDetails(req, res);
          const userId = details.params.user_id as string | undefined;
          if (userId) {
            const client = await provider.Client.find(details.params.client_id);
            const appUri = client?.clientUri ?? "";
            const appName = client?.clientName ?? client?.clientId ?? "";
            edits.links = edits.links || [];
            edits.links.push({
              url: appUri,
              label: userId,
              platform: appName,
              is_verified: true,
            });
          }

          await applyProfileChanges(verifiedAddress, edits);
        } catch (err) {
          console.error("Profile write failed:", err);
        }
      }

      // Create OIDC grant with requested scopes (auto-consent)
      try {
        const details = await provider.interactionDetails(req, res);
        const requestedScopes = (details.params.scope || "openid").split(" ");

        const grant = new provider.Grant({
          accountId: verifiedAddress,
          clientId: details.params.client_id as string,
        });
        grant.addOIDCScope(requestedScopes.join(" "));
        const grantId = await grant.save();

        const redirectTo = await provider.interactionResult(req, res, {
          login: { accountId: verifiedAddress },
          consent: { grantId },
        });

        return res.redirect(redirectTo);
      } catch {
        return res.status(400).send("Interaction session expired or invalid. Please refresh the original login page.");
      }
    }

    return res.status(400).send("Invalid action");
  });
}