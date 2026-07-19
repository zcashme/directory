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
  // ── GET /demo — real end-to-end demo (no OIDC session required) ─────────
  app.get("/demo", (_req, res) => {
    res.type("html").send(renderDemoPage());
  });

  // ── POST /demo/resolve — resolve ZNS name (no uid needed) ────────────────
  app.post("/demo/resolve", async (req, res) => {
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

  // ── POST /demo/memo — generate QR code (no uid needed) ───────────────────
  app.post("/demo/memo", async (req, res) => {
    const address = (req.body?.address ?? "").trim();
    if (!address) return res.json({ error: "Address is required" });
    const sessionId = generateSessionId(16);
    const memo = buildZvsMemo(sessionId, address);
    const uri = buildZcashUri(SERVICE_ADDRESS, MIN_PAYMENT_ZEC, memo);
    const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });
    res.json({ memo, uri, qr });
  });

  // ── POST /demo/verify — verify OTP (no OIDC redirect, just 200/400) ──────
  app.post("/demo/verify", async (req, res) => {
    const otp = (req.body?.otp ?? "").trim();
    const memo = (req.body?.memo ?? "").trim();
    if (!otp || !memo) return res.status(400).json({ error: "Missing fields" });
    const valid = await verifyOtp(memo, otp);
    if (!valid) return res.status(400).json({ error: "Invalid code. Check your wallet memo and try again." });
    res.json({ ok: true });
  });

  // ── GET /interaction/:uid — serve the HTML login page ───────
  app.get("/interaction/:uid", async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);

      // prompt=none means "don't show UI — return an error if not logged in"
      if (details.prompt.name === "none") {
        return provider.interactionFinished(req, res, {
          error: "login_required",
          error_description: "End-User is not logged in",
        });
      }

      const client = await provider.Client.find(details.params.client_id);
      const appName = client?.clientName ?? client?.clientId ?? "Unknown App";

      res.type("html").send(renderLoginPage(req.params.uid, appName));
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

  // ── POST /interaction/:uid — unified form submission ────────────
  app.post("/interaction/:uid", async (req, res) => {
    
    // Check if this is the OTP verification step
    if (req.body?.action === "verify") {
      const otp = (req.body?.otp ?? "").trim();
      const memo = (req.body?.memo ?? "").trim();
      const address = (req.body?.address ?? "").trim();

      if (!otp || !memo || !address) {
        return res.status(400).send("Missing fields");
      }

    const valid = await verifyOtp(memo, otp);
    if (!valid) {
      return res.status(400).send("Invalid verification code. Please go back and try again.");
    }

    // OTP verified — create a grant with the requested scopes (auto-consent)
    try {
      const details = await provider.interactionDetails(req, res);
      const requestedScopes = (details.params.scope || "openid").split(" ");

      const grant = new provider.Grant({
        accountId: address,
        clientId: details.params.client_id as string,
      });
      grant.addOIDCScope(requestedScopes.join(" "));
      const grantId = await grant.save();

      // Tell oidc-provider the login succeeded — it issues the auth code
      const redirectTo = await provider.interactionResult(req, res, {
        login: { accountId: address },
        consent: { grantId },
      });

      // Since this is a form submission, we natively redirect!
      return res.redirect(redirectTo);
    } catch (err) {
      console.error("Interaction details error:", err);
      return res.status(400).send("Interaction session expired or invalid. Please refresh the original login page.");
    }
    }
    
    return res.status(400).send("Invalid action");
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

function renderLoginPage(
  uid: string,
  clientName: string = "ZcashMe",
  error: string | null = null,
  isProcessing: boolean = false
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to ${escapeHtml(clientName)} - Zcash.me</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background-color: #fafafa;
    background-image: 
      radial-gradient(at 0% 0%, rgba(229, 231, 235, 0.4) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(229, 231, 235, 0.4) 0px, transparent 50%);
    background-attachment: fixed;
    color: #111827;
  }
  
  .profile-card {
    background-color: #ffffff;
    border-color: #e5e7eb;
    box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.1);
  }

  .brand-input {
    background-color: #f9fafb;
    border: 1px solid #d1d5db;
    transition: all 0.2s;
  }
  
  .brand-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
    outline: none;
    background-color: #ffffff;
  }

  .btn-join {
    background-color: #16a34a;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);
  }
  .btn-join:hover:not(:disabled) {
    background-color: #15803d;
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
  }
  .btn-join:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .badge-verified {
    color: #166534;
    background: linear-gradient(to right, #dcfce7, #bbf7d0);
    border: 1px solid #86efac;
  }

  .address-pill {
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #d1d5db;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  }
  
  .spinner {
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
    width: 20px;
    height: 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

<div class="profile-card w-[340px] rounded-[24px] border p-8 text-center flex flex-col relative overflow-hidden z-10 transition-transform duration-300">
  
  <!-- Step 1: Identify -->
  <div id="step-identify" class="flex flex-col h-full">
    
    <div class="mb-8 flex flex-col items-center">
      <img src="https://zcash.me/assets/icons/zcashme-logo.svg" alt="Zcash.me" class="w-12 h-12 mb-4" onerror="this.outerHTML='<div class=\\'w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl mb-4\\'>Z/</div>'">
      <h2 class="text-xl font-bold text-gray-900 tracking-tight">Sign in to ${escapeHtml(clientName)}</h2>
      <p class="text-[13px] text-gray-500 mt-1.5">Authenticate with your profile</p>
    </div>

    <div class="flex-1 flex flex-col justify-center w-full">
      <div class="mb-2 relative">
        <input id="name-input" type="text" placeholder="username or address"
          class="brand-input w-full rounded-xl px-5 py-3.5 text-sm text-center text-gray-900 placeholder-gray-400 font-medium" autocomplete="off" autofocus>
        <div class="text-red-500 text-[11px] mt-2 h-4" id="error-identify">${escapeHtml(error || "")}</div>
      </div>
    </div>

    <div class="mt-4">
      <button id="btn-continue" class="btn-join w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" onclick="resolveName()">
        Continue
      </button>
    </div>

    <div class="mt-8 pt-5 border-t border-gray-100">
      <p class="text-[13px] text-gray-500">
        Don't have a Zcash.me account? <br>
        <a href="https://zcash.me" target="_blank" class="text-green-600 font-semibold hover:text-green-700 transition-colors inline-block mt-1">Create one</a>
      </p>
    </div>
  </div>

  <!-- Step 2: Payment/QR -->
  <div id="step-payment" class="hidden flex flex-col h-full">
    
    <div class="relative z-10 flex flex-col items-center justify-center gap-1.5 mb-6 mt-2">
      <div class="relative">
        <div class="w-20 h-20 rounded-full border border-gray-200 bg-gray-50 shadow-sm overflow-hidden flex items-center justify-center">
          <span id="profile-initial" class="text-3xl font-bold text-gray-400">?</span>
        </div>
        <span class="absolute -right-2 -bottom-1 z-30">
          <span class="badge-verified inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-sm">
            <svg class="h-3.5 w-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z"></path>
            </svg>
            Verified
          </span>
        </span>
      </div>
      <span id="profile-name" class="text-xl font-bold text-gray-900 truncate max-w-full mt-3"></span>
      
      <div class="address-pill rounded-full px-3 py-1.5 flex items-center mt-1">
        <span id="profile-address" class="font-mono text-[10px] text-gray-600 tracking-tight"></span>
      </div>
    </div>

    <div class="flex-1 min-h-0 w-full relative z-10 flex flex-col mb-6">
      <div class="rounded-2xl border border-gray-200 bg-gray-50 shadow-inner p-4 flex flex-col items-center">
        <div class="bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-3">
          <img id="qr-img" class="w-[130px] h-[130px]" src="" alt="QR">
        </div>
        <p class="text-[11px] text-gray-500 text-center font-medium leading-relaxed">
          Scan with your Zcash wallet<br>Minimum 0.002 ZEC
        </p>
      </div>
    </div>

    <div>
      <input id="otp-input" type="text" inputmode="numeric" maxlength="6" placeholder="• • • • • •" 
        class="brand-input w-full rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.4em] text-gray-900 font-mono mb-1">
      <div class="text-red-500 text-[11px] h-4 mb-3" id="error-otp"></div>
      
      <button id="btn-verify" class="btn-join w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" disabled onclick="verifyOTP()">
        Verify Code
      </button>
      <button class="text-[11px] text-gray-400 hover:text-gray-700 mt-4 font-medium transition-colors" onclick="location.reload()">Cancel login</button>
    </div>
  </div>

  <!-- Step 3: Redirecting -->
  <div id="step-redirecting" class="hidden flex flex-col items-center justify-center h-full py-20">
    <div class="spinner !border-gray-200 !border-top-green-500 !w-10 !h-10 mb-6"></div>
    <span class="text-lg font-bold text-gray-900">Verified!</span>
    <p class="text-[13px] text-gray-500 mt-2">Returning to ${escapeHtml(clientName)}...</p>
  </div>

</div>

<div aria-hidden="true" class="fixed bottom-10 left-0 right-0 h-px pointer-events-none" 
  style="background-image:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.5) 36px, rgba(229,231,235,0.5) calc(100% - 36px), rgba(229,231,235,0) 100%)"></div>

<script>
  const uid = "${uid}";
  const $ = id => document.getElementById(id);

  let memo = "";
  let currentAddress = "";

  async function resolveName() {
    const name = $("name-input").value.trim();
    if (!name) return;
    $("btn-continue").disabled = true;
    $("btn-continue").innerHTML = '<div class="spinner !border-gray-300 !border-top-white !w-5 !h-5"></div>';
    $("error-identify").textContent = "";

    try {
      const res = await fetch("/interaction/" + uid + "/resolve", {
        method: "POST", 
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) { 
        $("error-identify").textContent = data.error; 
        $("btn-continue").disabled = false; 
        $("btn-continue").textContent = 'Continue';
        return; 
      }

      currentAddress = data.address;
      
      // Update UI
      if (data.profile_image_url) {
        $("profile-initial").parentElement.innerHTML = \`<img class="w-full h-full object-cover" src="\${data.profile_image_url}" alt="Profile">\`;
      } else {
        $("profile-initial").textContent = (data.name || name).charAt(0).toUpperCase();
      }
      $("profile-name").textContent = data.name || (name.length > 15 ? name.slice(0,15) + "..." : name);
      $("profile-address").textContent = currentAddress.slice(0, 6) + "..." + currentAddress.slice(-6);
      
      await generateMemo(currentAddress);
      
      $("step-identify").classList.add("hidden");
      $("step-payment").classList.remove("hidden");
    } catch { 
      $("error-identify").textContent = "Failed to resolve name."; 
      $("btn-continue").disabled = false; 
      $("btn-continue").textContent = 'Continue';
    }
  }

  async function generateMemo(addr) {
    try {
      const res = await fetch("/interaction/" + uid + "/memo", {
        method: "POST", 
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.error) { $("error-otp").textContent = data.error; return; }
      memo = data.memo;
      $("qr-img").src = data.qr;
    } catch { $("error-otp").textContent = "Failed to generate QR."; }
  }

  $("otp-input").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\\D/g, "");
    $("btn-verify").disabled = e.target.value.length !== 6;
  });

  async function verifyOTP() {
    const otp = $("otp-input").value.trim();
    if (otp.length !== 6) return;
    $("btn-verify").disabled = true;
    $("btn-verify").innerHTML = '<div class="spinner !border-gray-300 !border-top-white !w-5 !h-5"></div>';

    // Submit natively via form to guarantee browser sends interaction cookie
    $("hidden-otp").value = otp;
    $("hidden-memo").value = memo;
    $("hidden-address").value = currentAddress;
    $("verify-form").submit();
  }

  // Handle Enter keys
  $("name-input").addEventListener("keypress", e => {
    if (e.key === "Enter") resolveName();
  });
  $("otp-input").addEventListener("keypress", e => {
    if (e.key === "Enter" && !$("btn-verify").disabled) verifyOTP();
  });
</script>
<form id="verify-form" method="POST" action="/interaction/${uid}" class="hidden">
  <input type="hidden" name="action" value="verify">
  <input type="hidden" name="otp" id="hidden-otp">
  <input type="hidden" name="memo" id="hidden-memo">
  <input type="hidden" name="address" id="hidden-address">
</form>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ── Demo page (real end-to-end, no OIDC session) ──────────────────────────

function renderDemoPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Try ZcashMe — Live Demo</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background-color: #fafafa;
    background-image:
      radial-gradient(at 0% 0%, rgba(229, 231, 235, 0.4) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(229, 231, 235, 0.4) 0px, transparent 50%);
    background-attachment: fixed;
    color: #111827;
  }
  .profile-card {
    background-color: #ffffff;
    border-color: #e5e7eb;
    box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.1);
  }
  .brand-input {
    background-color: #f9fafb;
    border: 1px solid #d1d5db;
    transition: all 0.2s;
  }
  .brand-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
    outline: none;
    background-color: #ffffff;
  }
  .btn-join {
    background-color: #16a34a;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);
  }
  .btn-join:hover:not(:disabled) {
    background-color: #15803d;
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
  }
  .btn-join:disabled { opacity: 0.6; cursor: not-allowed; }
  .badge-verified {
    color: #166534;
    background: linear-gradient(to right, #dcfce7, #bbf7d0);
    border: 1px solid #86efac;
  }
  .address-pill {
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #d1d5db;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  }
  .spinner {
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
    width: 20px; height: 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
<\/style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

<!-- Demo banner -->
<div class="mb-4 px-4 py-2 rounded-full bg-red-50 border border-red-300 text-red-600 text-[11px] font-semibold tracking-wide">
  ⚠ Warning: this is a demo
</div>

<div class="profile-card w-[340px] rounded-[24px] border p-8 text-center flex flex-col relative overflow-hidden z-10">

  <!-- Step 1: Identify -->
  <div id="step-identify" class="flex flex-col h-full">
    <div class="mb-8 flex flex-col items-center">
      <img src="https://zcash.me/assets/icons/zcashme-logo.svg" alt="Zcash.me" class="w-12 h-12 mb-4" onerror="this.outerHTML='<div class=\'w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl mb-4\'>Z/<\/div>'">
      <h2 class="text-xl font-bold text-gray-900 tracking-tight">Try signing in</h2>
      <p class="text-[13px] text-gray-500 mt-1.5">Enter your Zcash.me username</p>
    </div>
    <div class="flex-1 flex flex-col justify-center w-full">
      <div class="mb-2 relative">
        <input id="name-input" type="text" placeholder="username or address"
          class="brand-input w-full rounded-xl px-5 py-3.5 text-sm text-center text-gray-900 placeholder-gray-400 font-medium" autocomplete="off" autofocus>
        <div class="text-red-500 text-[11px] mt-2 h-4" id="error-identify"></div>
      </div>
    </div>
    <div class="mt-4">
      <button id="btn-continue" class="btn-join w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" onclick="resolveName()">
        Continue
      </button>
    </div>
    <div class="mt-8 pt-5 border-t border-gray-100">
      <p class="text-[13px] text-gray-500">
        Don't have a Zcash.me account? <br>
        <a href="https://zcash.me" target="_blank" class="text-green-600 font-semibold hover:text-green-700 transition-colors inline-block mt-1">Create one</a>
      </p>
    </div>
  </div>

  <!-- Step 2: Payment/QR -->
  <div id="step-payment" class="hidden flex flex-col h-full">
    <div class="relative z-10 flex flex-col items-center justify-center gap-1.5 mb-6 mt-2">
      <div class="relative">
        <div id="profile-avatar" class="w-20 h-20 rounded-full border border-gray-200 bg-gray-50 shadow-sm overflow-hidden flex items-center justify-center">
          <span id="profile-initial" class="text-3xl font-bold text-gray-400">?</span>
        </div>
        <span class="absolute -right-2 -bottom-1 z-30">
          <span class="badge-verified inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-sm">
            <svg class="h-3.5 w-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z"></path>
            </svg>
            Verified
          </span>
        </span>
      </div>
      <span id="profile-name" class="text-xl font-bold text-gray-900 truncate max-w-full mt-3"></span>
      <div class="address-pill rounded-full px-3 py-1.5 flex items-center mt-1">
        <span id="profile-address" class="font-mono text-[10px] text-gray-600 tracking-tight"></span>
      </div>
    </div>
    <div class="flex-1 min-h-0 w-full relative z-10 flex flex-col mb-6">
      <div class="rounded-2xl border border-gray-200 bg-gray-50 shadow-inner p-4 flex flex-col items-center">
        <div class="bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-3">
          <img id="qr-img" class="w-[130px] h-[130px]" src="" alt="QR">
        </div>
        <p class="text-[11px] text-gray-500 text-center font-medium leading-relaxed">
          Scan with your Zcash wallet<br>Minimum 0.002 ZEC
        </p>
      </div>
    </div>
    <div>
      <input id="otp-input" type="text" inputmode="numeric" maxlength="6" placeholder="• • • • • •"
        class="brand-input w-full rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.4em] text-gray-900 font-mono mb-1">
      <div class="text-red-500 text-[11px] h-4 mb-3" id="error-otp"></div>
      <button id="btn-verify" class="btn-join w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" disabled onclick="verifyOTP()">
        Verify Code
      </button>
      <button class="text-[11px] text-gray-400 hover:text-gray-700 mt-4 font-medium transition-colors" onclick="location.reload()">Cancel</button>
    </div>
  </div>

  <!-- Step 3: Success -->
  <div id="step-success" class="hidden flex flex-col items-center justify-center h-full py-12">
    <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
      <svg class="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z"></path>
      </svg>
    </div>
    <span class="text-lg font-bold text-gray-900">Verified!</span>
    <p class="text-[13px] text-gray-500 mt-2 mb-6">Identity confirmed on-chain.</p>
    <div class="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left">
      <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Authenticated as</p>
      <p id="success-name" class="text-sm font-bold text-gray-900"></p>
      <p id="success-address" class="font-mono text-[10px] text-gray-500 mt-0.5 break-all"></p>
    </div>
    <button class="mt-6 text-[12px] text-green-600 font-semibold hover:text-green-700 transition-colors" onclick="location.reload()">Try again →</button>
  </div>

</div>

<div aria-hidden="true" class="fixed bottom-10 left-0 right-0 h-px pointer-events-none"
  style="background-image:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.5) 36px, rgba(229,231,235,0.5) calc(100% - 36px), rgba(229,231,235,0) 100%)"></div>

<script>
  const $ = id => document.getElementById(id);
  let memo = "";
  let currentAddress = "";
  let currentName = "";

  async function resolveName() {
    const name = $("name-input").value.trim();
    if (!name) return;
    $("btn-continue").disabled = true;
    $("btn-continue").innerHTML = '<div class="spinner"></div>';
    $("error-identify").textContent = "";
    try {
      const res = await fetch("/demo/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) {
        $("error-identify").textContent = data.error;
        $("btn-continue").disabled = false;
        $("btn-continue").textContent = "Continue";
        return;
      }
      currentAddress = data.address;
      currentName = data.display_name || data.name || name;
      if (data.profile_image_url) {
        $("profile-avatar").innerHTML = \`<img class="w-full h-full object-cover" src="\${data.profile_image_url}" alt="Profile">\`;
      } else {
        $("profile-initial").textContent = currentName.charAt(0).toUpperCase();
      }
      $("profile-name").textContent = currentName.length > 20 ? currentName.slice(0, 20) + "..." : currentName;
      $("profile-address").textContent = currentAddress.slice(0, 8) + "..." + currentAddress.slice(-6);
      await generateMemo(currentAddress);
      $("step-identify").classList.add("hidden");
      $("step-payment").classList.remove("hidden");
    } catch {
      $("error-identify").textContent = "Failed to resolve name.";
      $("btn-continue").disabled = false;
      $("btn-continue").textContent = "Continue";
    }
  }

  async function generateMemo(addr) {
    try {
      const res = await fetch("/demo/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.error) { $("error-otp").textContent = data.error; return; }
      memo = data.memo;
      $("qr-img").src = data.qr;
    } catch { $("error-otp").textContent = "Failed to generate QR."; }
  }

  $("otp-input").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\\D/g, "");
    $("btn-verify").disabled = e.target.value.length !== 6;
  });

  async function verifyOTP() {
    const otp = $("otp-input").value.trim();
    if (otp.length !== 6) return;
    $("btn-verify").disabled = true;
    $("btn-verify").innerHTML = '<div class="spinner"></div>';
    $("error-otp").textContent = "";
    try {
      const res = await fetch("/demo/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, memo }),
      });
      const data = await res.json();
      if (!res.ok) {
        $("error-otp").textContent = data.error || "Invalid code.";
        $("btn-verify").disabled = false;
        $("btn-verify").textContent = "Verify Code";
        return;
      }
      $("success-name").textContent = currentName;
      $("success-address").textContent = currentAddress;
      $("step-payment").classList.add("hidden");
      $("step-success").classList.remove("hidden");
    } catch {
      $("error-otp").textContent = "Verification failed.";
      $("btn-verify").disabled = false;
      $("btn-verify").textContent = "Verify Code";
    }
  }

  $("name-input").addEventListener("keypress", e => { if (e.key === "Enter") resolveName(); });
  $("otp-input").addEventListener("keypress", e => { if (e.key === "Enter" && !$("btn-verify").disabled) verifyOTP(); });
<\/script>
</body>
</html>`;
}