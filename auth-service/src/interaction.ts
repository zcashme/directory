/**
 * Interaction handler — the login page + API endpoints.
 *
 * This serves the HTML login screen that users see when they click
 * "Sign in with Zcash" on a developer's app, plus the API endpoints
 * the login page's JavaScript calls for name resolution, QR generation,
 * and OTP verification.
 *
 * All routes are on auth.zcash.me (same domain as the provider) so
 * provider.interactionResult() can read the _interaction cookie.
 */

import type { Express } from "express";
import QRCode from "qrcode";
import { resolveName } from "./account.js";
import {
  generateSessionId,
  buildZvsMemo,
  buildZcashUri,
  verifyOtp,
  SERVICE_ADDRESS,
  MIN_PAYMENT_ZEC,
} from "./zvs.js";

export function setupInteraction(app: Express, provider: any) {
  // ── GET /interaction/:uid — serve the HTML login page ───────
  app.get("/interaction/:uid", async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const client = await provider.Client.find(details.params.client_id);
      const appName = client?.clientName ?? client?.clientId ?? "Unknown App";

      res.type("html").send(renderLoginPage(appName));
    } catch (err) {
      res.status(400).send("<h1>Session expired</h1><p>Please restart the login.</p>");
    }
  });

  // ── POST /interaction/:uid/resolve — resolve Zcash name ────
  app.post("/interaction/:uid/resolve", async (req, res) => {
    const name = (req.body?.name ?? "").trim();
    if (!name) return res.json({ error: "Name is required" });

    const result = await resolveName(name);
    if (!result?.address) return res.json({ error: "Name not found" });

    res.json({
      address: result.address,
      name: result.name,
      display_name: result.display_name,
      profile_image_url: result.profile_image_url,
    });
  });

  // ── POST /interaction/:uid/memo — generate QR code ─────────
  app.post("/interaction/:uid/memo", async (req, res) => {
    const address = (req.body?.address ?? "").trim();
    if (!address) return res.json({ error: "Address is required" });

    const sessionId = generateSessionId(16);
    const memo = buildZvsMemo(sessionId, address);
    const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);
    const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });

    res.json({ memo, uri, qr });
  });

  // ── POST /interaction/:uid/verify — verify OTP ────────────
  app.post("/interaction/:uid/verify", async (req, res) => {
    const otp = (req.body?.otp ?? "").trim();
    const memo = (req.body?.memo ?? "").trim();
    const address = (req.body?.address ?? "").trim();

    if (!otp || !memo || !address) return res.json({ error: "Missing fields" });

    const valid = await verifyOtp(memo, otp);
    if (!valid) return res.json({ error: "Invalid verification code" });

    // OTP verified — create a grant with the requested scopes (auto-consent)
    const details = await provider.interactionDetails(req, res);
    const requestedScopes = (details.params.scope || "openid").split(" ");

    const grant = new provider.Grant({
      accountId: address,
      clientId: details.params.client_id,
    });
    grant.addOIDCScope(requestedScopes.join(" "));
    const grantId = await grant.save();

    // Tell oidc-provider the login succeeded — it issues the auth code
    const redirectTo = await provider.interactionResult(req, res, {
      login: { accountId: address },
      consent: { grantId },
    });

    res.json({ redirectTo });
  });

  // ── GET /interaction/:uid/abort — abort login ─────────────
  app.get("/interaction/:uid/abort", async (req, res) => {
    try {
      await provider.interactionFinished(req, res, {
        error: "access_denied",
        error_description: "End-User aborted interaction",
      });
    } catch {
      res.redirect("/");
    }
  });
}

// ── HTML login page ────────────────────────────────────────────

function renderLoginPage(appName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to ${escapeHtml(appName)} — ZcashMe</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;
    display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
  .card{width:100%;max-width:400px}
  h1{font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:.25rem}
  .subtitle{text-align:center;color:#737373;font-size:.875rem;margin-bottom:1.5rem}
  .box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:1rem;padding:1.5rem}
  input{width:100%;background:#0a0a0a;border:1px solid #333;border-radius:.75rem;
    padding:.75rem 1rem;color:#fff;font-size:.875rem;outline:none}
  input:focus{border-color:#3b82f6}
  button{width:100%;background:#3b82f6;border:none;border-radius:.75rem;
    padding:.75rem 1rem;color:#fff;font-size:.875rem;font-weight:600;cursor:pointer}
  button:hover{background:#2563eb}
  button:disabled{opacity:.5;cursor:not-allowed}
  .error{color:#ef4444;font-size:.8rem;text-align:center;min-height:1.2rem;margin-top:.5rem}
  .hidden{display:none}
  .qr{text-align:center;margin:1rem 0}
  .qr img{width:200px;height:200px;border-radius:.5rem;background:#fff;padding:8px}
  .hint{font-size:.75rem;color:#525252;text-align:center;margin-top:.5rem;line-height:1.4}
  .profile{display:flex;align-items:center;gap:.75rem;padding:.75rem;
    background:#0a0a0a;border-radius:.75rem;margin-bottom:1rem}
  .avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#333}
  .avatar-placeholder{width:40px;height:40px;border-radius:50%;background:#333;
    display:flex;align-items:center;justify-content:center;font-weight:600}
  .profile-info{flex:1;min-width:0}
  .profile-name{font-size:.875rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .profile-addr{font-size:.75rem;color:#525252;font-family:monospace;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .change{font-size:.75rem;color:#3b82f6;cursor:pointer;background:none;border:none}
  .divider{border-top:1px solid #2a2a2a;margin:1rem 0}
  .spinner{display:inline-block;width:32px;height:32px;border:2px solid #333;
    border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading{text-align:center;padding:2rem 0;color:#525252;font-size:.875rem}
</style>
</head>
<body>
<div class="card">
  <h1>Sign in to ${escapeHtml(appName)}</h1>
  <p class="subtitle">with Zcash</p>
  <div class="box">

    <!-- Step 1: Name input -->
    <div id="step-identify">
      <label for="name-input" style="display:block;font-size:.8rem;margin-bottom:.5rem;color:#a3a3a3">
        Your Zcash name or address
      </label>
      <input id="name-input" type="text" placeholder="alice.zcash or u1qqlzrf9..."
        autocomplete="off" autofocus>
      <div class="error" id="error-identify"></div>
      <button id="btn-continue" style="margin-top:.75rem">Continue</button>
    </div>

    <!-- Step 2: QR + OTP -->
    <div id="step-payment" class="hidden">
      <div class="profile" id="profile-preview"></div>

      <div class="qr" id="qr-container">
        <img id="qr-img" alt="QR code">
      </div>
      <p style="text-align:center;font-size:.875rem;font-weight:600;color:#3b82f6">
        Send payment to receive a code
      </p>
      <p class="hint">Include a minimum of ${MIN_PAYMENT_ZEC} ZEC.<br>
        Do not leave the page before entering the code.</p>

      <div class="divider"></div>

      <label for="otp-input" style="display:block;font-size:.75rem;color:#a3a3a3;text-align:center;margin-bottom:.5rem">
        Enter the code from your wallet:
      </label>
      <input id="otp-input" type="text" inputmode="numeric" maxlength="6"
        placeholder="000000" style="text-align:center;font-size:1.25rem;letter-spacing:.5rem">
      <div class="error" id="error-otp"></div>
      <button id="btn-verify" style="margin-top:.75rem" disabled>Verify Code</button>
    </div>

    <!-- Step 3: Redirecting -->
    <div id="step-redirecting" class="hidden">
      <div class="loading">
        <div class="spinner"></div>
        <p style="margin-top:1rem">Verified! Redirecting you back...</p>
      </div>
    </div>

  </div>
  <p style="text-align:center;font-size:.75rem;color:#404040;margin-top:1rem">
    Powered by <a href="https://zcash.me" style="color:#3b82f6">ZcashMe</a>
  </p>
</div>

<script>
const uid = location.pathname.split("/")[2];
const $ = id => document.getElementById(id);

// State
let memo = "";
let address = "";

// ── Step 1: Resolve name ──────────────────────────────────────
$("btn-continue").onclick = async () => {
  const name = $("name-input").value.trim();
  if (!name) return;
  $("btn-continue").disabled = true;
  $("error-identify").textContent = "";

  try {
    const res = await fetch("/interaction/" + uid + "/resolve", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.error) { $("error-identify").textContent = data.error; $("btn-continue").disabled = false; return; }

    address = data.address;
    showProfile(data);
    await generateMemo(address);
    $("step-identify").classList.add("hidden");
    $("step-payment").classList.remove("hidden");
  } catch { $("error-identify").textContent = "Failed to resolve name."; $("btn-continue").disabled = false; }
};

// ── Step 2a: Generate QR ─────────────────────────────────────
async function generateMemo(addr) {
  try {
    const res = await fetch("/interaction/" + uid + "/memo", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ address: addr }),
    });
    const data = await res.json();
    if (data.error) { $("error-otp").textContent = data.error; return; }
    memo = data.memo;
    $("qr-img").src = data.qr;
  } catch { $("error-otp").textContent = "Failed to generate QR."; }
}

// ── Profile preview ──────────────────────────────────────────
function showProfile(data) {
  const name = data.name || data.display_name || address.slice(0,10) + "...";
  const initials = (data.name || address).charAt(0).toUpperCase();
  const avatar = data.profile_image_url
    ? '<img class="avatar" src="' + data.profile_image_url + '" alt="">'
    : '<div class="avatar-placeholder">' + initials + '</div>';
  $("profile-preview").innerHTML =
    avatar + '<div class="profile-info"><div class="profile-name">' + escapeHtml(name) + '</div>' +
    '<div class="profile-addr">' + address.slice(0,16) + "..." + address.slice(-6) + '</div></div>' +
    '<button class="change" onclick="location.reload()">Change</button>';
}

// ── Step 2b: Verify OTP ──────────────────────────────────────
$("otp-input").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\\D/g, "");
  $("btn-verify").disabled = e.target.value.length !== 6;
});

$("btn-verify").onclick = async () => {
  const otp = $("otp-input").value.trim();
  if (otp.length !== 6) return;
  $("btn-verify").disabled = true;
  $("error-otp").textContent = "";

  try {
    const res = await fetch("/interaction/" + uid + "/verify", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ otp, memo, address }),
    });
    const data = await res.json();
    if (data.error) {
      $("error-otp").textContent = data.error;
      $("btn-verify").disabled = false;
      return;
    }
    $("step-payment").classList.add("hidden");
    $("step-redirecting").classList.remove("hidden");
    window.location.href = data.redirectTo;
  } catch { $("error-otp").textContent = "Verification failed."; $("btn-verify").disabled = false; }
};

function escapeHtml(s) { return s.replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}