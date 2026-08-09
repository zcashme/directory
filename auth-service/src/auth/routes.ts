/**
 * OIDC interaction and demo routes.
 *
 * Both paths authenticate an existing ZcashMe profile selected by username.
 * A payment session binds that selected profile to the OTP flow server-side.
 */

import type { Express, Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { loadLinks, resolveUsername, type ZcasherRow } from "../profile/lookup.js";
import { applyProfileChanges, ensurePgpzProofLink, type ProfileEdits } from "../profile/write.js";
import { getPgpzProofLink, type PgpzProofLink } from "./pgpz.js";
import {
  consumePaymentSession,
  createPaymentSession,
  getPaymentSession,
} from "./payment-session.js";
import {
  buildZcashUri,
  buildZvsMemo,
  generateSessionId,
  MIN_PAYMENT_ZEC,
  parseZvsMemo,
  SERVICE_ADDRESS,
} from "../zvs/memo.js";
import { verifyOtp } from "../zvs/otp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function profileResponse(
  profile: ZcasherRow,
  memo: string,
  qr: string,
  links: unknown[],
  pendingProof?: PgpzProofLink,
) {
  return {
    id: profile.id,
    address: profile.address,
    name: profile.name,
    display_name: profile.display_name,
    bio: profile.bio,
    profile_image_url: profile.profile_image_url,
    nearest_city_name: profile.nearest_city_name,
    address_verified: profile.address_verified,
    links,
    memo,
    qr,
    payment_address: SERVICE_ADDRESS,
    pendingProof,
  };
}

function readProfileEdits(value: unknown): ProfileEdits {
  if (!value) return { links: [] };
  const edits = typeof value === "string" ? JSON.parse(value) : value;
  if (!edits || typeof edits !== "object") throw new Error("Invalid profile edits");

  const candidate = edits as Partial<ProfileEdits>;
  return {
    display_name: candidate.display_name,
    bio: candidate.bio,
    nearest_city_name: candidate.nearest_city_name,
    country: candidate.country,
    iso2: candidate.iso2,
    links: Array.isArray(candidate.links) ? candidate.links : [],
  };
}

async function startProfileVerification(
  username: string,
  context: { demo: boolean; interactionUid?: string; pgpzProof?: PgpzProofLink },
) {
  const profile = await resolveUsername(username.trim());
  if (!profile?.id || !profile.address) return null;

  const sessionId = generateSessionId(16);
  await createPaymentSession(sessionId, {
    profileId: profile.id,
    interactionUid: context.interactionUid,
    demo: context.demo,
    pgpzProof: context.pgpzProof,
  });

  const memo = buildZvsMemo(sessionId, profile.address);
  const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);
  const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });
  const links = await loadLinks(profile.id);
  return profileResponse(profile, memo, qr, links, context.pgpzProof);
}

async function completeProfileVerification(
  req: Request,
  res: Response,
  context: { demo: boolean; provider?: any },
): Promise<{ profileId: number } | { error: string; status: number }> {
  const otp = String(req.body?.otp ?? "").trim();
  const memo = String(req.body?.memo ?? "").trim();
  if (!otp || !memo) return { error: "Missing fields", status: 400 };

  const parsed = parseZvsMemo(memo);
  if (!parsed) return { error: "Invalid memo format.", status: 400 };

  const paymentSession = await getPaymentSession(parsed.sessionId);
  if (!paymentSession || paymentSession.consumed || paymentSession.demo !== context.demo) {
    return { error: "Verification session expired. Please start again.", status: 400 };
  }

  if (context.provider) {
    let details: any;
    try {
      details = await context.provider.interactionDetails(req, res);
    } catch {
      return { error: "Interaction session expired. Please restart sign-in.", status: 403 };
    }
    if (details.uid !== paymentSession.interactionUid) {
      return { error: "Verification session does not match this sign-in.", status: 403 };
    }
  }

  if (!(await verifyOtp(memo, otp))) {
    return { error: "Invalid verification code. Please go back and try again.", status: 400 };
  }

  try {
    await applyProfileChanges(paymentSession.profileId, readProfileEdits(req.body?.profile_edits));
    if (paymentSession.pgpzProof) {
      await ensurePgpzProofLink(paymentSession.profileId, paymentSession.pgpzProof);
    }
    await consumePaymentSession(parsed.sessionId);
  } catch (error) {
    console.error("Profile verification write failed:", error);
    return { error: "Could not save your profile. Please try again.", status: 500 };
  }

  return { profileId: paymentSession.profileId };
}

export function setupAuthRoutes(app: Express, provider: any) {
  // A standalone entry point for live development and demonstrations.
  app.get("/demo", (_req, res) => {
    return res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
  });

  app.post("/demo", async (req, res) => {
    const action = req.body?.action;

    if (action === "resolve") {
      const username = String(req.body?.username ?? "").trim();
      if (!username) return res.status(400).json({ error: "Username is required" });
      const result = await startProfileVerification(username, { demo: true });
      if (!result) return res.status(404).json({ error: "ZcashMe profile not found" });
      return res.json(result);
    }

    if (action === "verify") {
      const result = await completeProfileVerification(req, res, { demo: true });
      if ("error" in result) return res.status(result.status).send(result.error);
      return res.json({ ok: true, isDemo: true });
    }

    return res.status(400).send("Invalid action");
  });

  app.get("/interaction/:uid", async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);
      if (details.prompt.name === "none") {
        return provider.interactionFinished(req, res, {
          error: "login_required",
          error_description: "End-User is not logged in",
        });
      }
      return res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
    } catch {
      return res.status(400).send("<h1>Session expired</h1><p>Please restart the login.</p>");
    }
  });

  app.post("/interaction/:uid", async (req, res) => {
    const action = req.body?.action;

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

    if (action === "resolve") {
      let details: any;
      try {
        details = await provider.interactionDetails(req, res);
      } catch {
        return res.status(403).json({ error: "Session expired" });
      }

      const username = String(req.body?.username ?? "").trim();
      if (!username) return res.status(400).json({ error: "Username is required" });
      let pgpzProof: PgpzProofLink | undefined;
      try {
        pgpzProof = getPgpzProofLink(details.params.client_id, details.params.label);
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid proof request" });
      }
      const result = await startProfileVerification(username, {
        demo: false,
        interactionUid: details.uid,
        pgpzProof,
      });
      if (!result) return res.status(404).json({ error: "ZcashMe profile not found" });
      return res.json(result);
    }

    if (action === "verify") {
      const result = await completeProfileVerification(req, res, { demo: false, provider });
      if ("error" in result) return res.status(result.status).send(result.error);

      try {
        const details = await provider.interactionDetails(req, res);
        const requestedScopes = (details.params.scope || "openid").split(" ");
        const accountId = String(result.profileId);
        const grant = new provider.Grant({
          accountId,
          clientId: details.params.client_id as string,
        });
        grant.addOIDCScope(requestedScopes.join(" "));
        const grantId = await grant.save();
        const redirectTo = await provider.interactionResult(req, res, {
          login: { accountId },
          consent: { grantId },
        });
        return res.redirect(redirectTo);
      } catch {
        return res
          .status(400)
          .send("Interaction session expired or invalid. Please refresh the original login page.");
      }
    }

    return res.status(400).send("Invalid action");
  });
}
