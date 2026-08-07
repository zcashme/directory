/**
 * Login page HTML template.
 * Pure function — takes data, returns HTML string, no side effects.
 * UI matches the zcash.me directory app design system.
 */

export function renderLoginPage(
  uid: string,
  clientName: string = "ZcashMe",
  appUri: string = "",
  userId: string = "",
) {
  const safeUid = JSON.stringify(uid);
  const safeAction = escapeHtml(`/interaction/${uid}`);
  const safeClientName = escapeHtml(clientName);
  const safeAppUri = escapeHtml(appUri);
  const safeUserId = escapeHtml(userId);
  const hasAppLink = Boolean(userId && appUri);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to ${safeClientName} - Zcash.me</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  :root {
    --color-brand-blue: #1d4ed8;
    --color-background: #faf6ed;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: var(--color-background);
    color: #111827;
  }
  .profile-card {
    background-color: #ffffff;
    border-color: #e5e7eb;
    box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.1);
  }
  .brand-input {
    background-color: transparent;
    border: 1px solid rgba(10, 17, 38, 0.6);
    border-radius: 1rem;
    transition: all 0.15s;
  }
  .brand-input:focus {
    border-color: var(--color-brand-blue);
    border-width: 2px;
    outline: none;
  }
  .field-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
  }
  .verify-hint {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }
  .btn-primary {
    background-color: var(--color-brand-blue);
    color: white;
    transition: all 0.2s;
  }
  .btn-primary:hover:not(:disabled) {
    background-color: #1e40af;
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-secondary {
    border: 1px solid rgba(10, 17, 38, 0.3);
    color: var(--color-brand-blue);
    transition: all 0.15s;
  }
  .btn-secondary:hover:not(:disabled) {
    border-color: var(--color-brand-blue);
  }
  .delete-btn {
    color: #dc2626;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .delete-btn:hover { text-decoration: underline; }
  .reset-btn {
    color: #15803d;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .reset-btn:hover { text-decoration: underline; }
  .spinner {
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
    width: 20px;
    height: 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .link-row {
    border: 1px solid rgba(10, 17, 38, 0.6);
    border-radius: 1rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .app-link-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.625rem;
    font-weight: 600;
    color: #15803d;
    border: 1px solid #86efac;
    background: linear-gradient(to right, #dcfce7, #bbf7d0);
  }
</style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

<div class="profile-card w-[400px] max-w-full rounded-[24px] border p-8 flex flex-col relative overflow-hidden z-10">

  <!-- Step 1: Identify -->
  <div id="step-identify" class="flex flex-col h-full">
    <div class="mb-8 flex flex-col items-center">
      <img src="https://zcash.me/assets/icons/zcashme-logo.svg" alt="Zcash.me" class="w-12 h-12 mb-4" onerror="this.outerHTML='<div class=\\'w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl mb-4\\'>Z/</div>'">
      <h2 class="text-xl font-bold text-gray-900 tracking-tight">Sign in to ${safeClientName}</h2>
      <p class="text-[13px] text-gray-500 mt-1.5">Authenticate with your profile</p>
    </div>
    <div class="flex-1 flex flex-col justify-center w-full">
      <div class="mb-2 relative">
        <input id="name-input" type="text" placeholder="username or address"
          class="brand-input w-full px-4 py-3 text-sm text-center text-gray-900 placeholder-gray-400 font-medium" autocomplete="off" autofocus>
        <div class="text-red-500 text-[11px] mt-2 h-4" id="error-identify"></div>
      </div>
    </div>
    <div class="mt-4">
      <button id="btn-continue" class="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" onclick="resolveName()">
        Continue
      </button>
    </div>
    <div class="mt-8 pt-5 border-t border-gray-100">
      <p class="text-[13px] text-gray-500 text-center">
        Don't have a Zcash.me account? <br>
        <a href="https://zcash.me" target="_blank" class="text-blue-700 font-semibold hover:text-blue-800 transition-colors inline-block mt-1">Create one</a>
      </p>
    </div>
  </div>

  <!-- Step 2: Profile Editor -->
  <div id="step-editor" class="hidden flex flex-col h-full">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-900">Edit Profile</h2>
      <span class="verify-hint">Changes apply after verification</span>
    </div>

    <!-- Profile preview -->
    <div class="flex items-center gap-3 mb-4 p-3 rounded-2xl border border-gray-200 bg-gray-50">
      <div class="w-12 h-12 rounded-full border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
        <span id="editor-avatar" class="text-xl font-bold text-gray-400">?</span>
      </div>
      <div class="min-w-0 flex-1">
        <p id="editor-username" class="font-semibold text-sm text-gray-900 truncate"></p>
        <p id="editor-address" class="font-mono text-[10px] text-gray-500 truncate"></p>
      </div>
    </div>

    <!-- Display Name -->
    <div class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <label class="field-label" for="edit-display-name">Display Name</label>
      </div>
      <input id="edit-display-name" type="text" maxlength="37" placeholder="Enter display name"
        class="brand-input w-full px-3 py-2 text-sm text-gray-800 placeholder-gray-400">
    </div>

    <!-- Bio -->
    <div class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <label class="field-label" for="edit-bio">Biography</label>
      </div>
      <div class="relative">
        <textarea id="edit-bio" rows="2" maxlength="100" placeholder="Your story in 100 bytes or less"
          class="brand-input w-full px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none"></textarea>
        <span id="bio-counter" class="absolute bottom-2 right-3 text-xs text-gray-400 hidden"></span>
      </div>
    </div>

    <!-- Links -->
    <div class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <label class="field-label">Links</label>
        <button type="button" onclick="addLinkRow()" class="text-xs font-semibold text-blue-700 hover:text-blue-800">＋ Add Link</button>
      </div>
      <div id="links-container"></div>
    </div>

    ${hasAppLink ? `
    <!-- App Link (locked) -->
    <div class="mb-4">
      <div class="mb-1 flex items-center justify-between">
        <label class="field-label">${safeClientName} Link</label>
        <span class="app-link-badge">
          <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z"/></svg>
          Auto-added
        </span>
      </div>
      <div class="link-row bg-gray-50">
        <input type="text" value="${safeAppUri}" readonly
          class="w-full px-2 py-1 text-sm text-gray-500 bg-transparent border-0 outline-none font-mono">
        <div class="flex items-center justify-between mt-1">
          <input type="text" value="${safeUserId}" readonly
            class="px-2 py-0.5 text-xs text-gray-500 bg-transparent border-0 outline-none">
          <span class="text-xs text-gray-400">Locked</span>
        </div>
      </div>
    </div>` : ''}

    <div class="mt-2 pt-4 border-t border-gray-100">
      <button id="btn-to-payment" class="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" onclick="goToPayment()">
        Continue to Payment
      </button>
      <button class="text-xs text-gray-400 hover:text-gray-700 mt-3 font-medium transition-colors w-full" onclick="document.getElementById('abort-form').submit()">Cancel</button>
    </div>
  </div>

  <!-- Step 3: Payment/QR -->
  <div id="step-payment" class="hidden flex flex-col h-full">
    <div class="relative z-10 flex flex-col items-center justify-center gap-1.5 mb-6 mt-2">
      <div class="relative">
        <div class="w-20 h-20 rounded-full border border-gray-200 bg-gray-50 shadow-sm overflow-hidden flex items-center justify-center">
          <span id="profile-initial" class="text-3xl font-bold text-gray-400">?</span>
        </div>
      </div>
      <span id="profile-name" class="text-xl font-bold text-gray-900 truncate max-w-full mt-3"></span>
      <div class="rounded-full px-3 py-1.5 flex items-center mt-1 bg-white/80 border border-gray-300">
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
        class="brand-input w-full px-4 py-3.5 text-center text-2xl tracking-[0.4em] text-gray-900 font-mono mb-1">
      <div class="text-red-500 text-[11px] h-4 mb-3" id="error-otp"></div>
      <button id="btn-verify" class="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center h-12" disabled onclick="verifyOTP()">
        Verify Code
      </button>
      <button class="text-[11px] text-gray-400 hover:text-gray-700 mt-4 font-medium transition-colors" onclick="document.getElementById('abort-form').submit()">Cancel login</button>
    </div>
  </div>

  <!-- Step 4: Redirecting -->
  <div id="step-redirecting" class="hidden flex flex-col items-center justify-center h-full py-20">
    <div class="spinner !border-gray-200 !border-top-blue-600 !w-10 !h-10 mb-6"></div>
    <span class="text-lg font-bold text-gray-900">Verified!</span>
    <p class="text-[13px] text-gray-500 mt-2">Returning to ${safeClientName}...</p>
  </div>

</div>

<div aria-hidden="true" class="fixed bottom-10 left-0 right-0 h-px pointer-events-none"
  style="background-image:linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.5) 36px, rgba(229,231,235,0.5) calc(100% - 36px), rgba(229,231,235,0) 100%)"></div>

<script>
  const uid = ${safeUid};
  const hasAppLink = ${hasAppLink};
  const appUri = ${JSON.stringify(appUri)};
  const userId = ${JSON.stringify(userId)};
  const appName = ${JSON.stringify(clientName)};
  const $ = id => document.getElementById(id);

  let memo = "";
  let profileData = null;
  let linkCounter = 0;

  async function resolveName() {
    const name = $("name-input").value.trim();
    if (!name) return;
    $("btn-continue").disabled = true;
    $("btn-continue").innerHTML = '<div class="spinner"></div>';
    $("error-identify").textContent = "";

    try {
      const res = await fetch("/interaction/" + uid, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({ action: "resolve", name }),
      });
      const data = await res.json();
      if (data.error) {
        $("error-identify").textContent = data.error;
        $("btn-continue").disabled = false;
        $("btn-continue").textContent = 'Continue';
        return;
      }

      memo = data.memo;
      profileData = data;

      // Populate editor
      if (data.profile_image_url) {
        const img = document.createElement('img');
        img.className = "w-full h-full object-cover";
        img.src = data.profile_image_url;
        img.alt = "Profile";
        $("editor-avatar").parentElement.replaceChildren(img);
        // Also set for payment step
        const img2 = img.cloneNode();
        $("profile-initial").parentElement.replaceChildren(img2);
      } else {
        const initial = (data.name || name).charAt(0).toUpperCase();
        $("editor-avatar").textContent = initial;
        $("profile-initial").textContent = initial;
      }
      $("editor-username").textContent = data.name || name;
      $("editor-address").textContent = data.address.slice(0, 8) + "..." + data.address.slice(-8);
      $("edit-display-name").value = data.display_name || "";
      $("edit-bio").value = data.bio || "";

      // Render existing links
      const container = $("links-container");
      container.innerHTML = "";
      if (data.links && data.links.length > 0) {
        data.links.forEach(link => {
          if (hasAppLink && link.url === appUri) return; // skip existing app link
          addLinkRow(link.id, link.url, link.label, link.platform);
        });
      }

      // Set up payment step
      $("profile-name").textContent = data.name || name;
      $("profile-address").textContent = data.address.slice(0, 6) + "..." + data.address.slice(-6);
      $("qr-img").src = data.qr;

      $("step-identify").classList.add("hidden");
      $("step-editor").classList.remove("hidden");
    } catch {
      $("error-identify").textContent = "Failed to resolve name.";
      $("btn-continue").disabled = false;
      $("btn-continue").textContent = 'Continue';
    }
  }

  function addLinkRow(id, url, label, platform) {
    const container = $("links-container");
    const rowId = "link-row-" + (++linkCounter);
    const row = document.createElement("div");
    row.className = "link-row";
    row.id = rowId;
    row.dataset.linkId = id || "";
    row.dataset.url = url || "";
    row.dataset.label = label || "";
    row.dataset.platform = platform || "Other";
    row.innerHTML = \`
      <div class="flex items-center gap-2">
        <input type="text" class="brand-input flex-1 px-2 py-1.5 text-sm font-mono text-gray-800" placeholder="https://example.com" value="\${url || ""}" oninput="updateLinkRow('\${rowId}', this.value)">
        <button type="button" class="delete-btn" onclick="removeLinkRow('\${rowId}')">⌫ Delete</button>
      </div>
    \`;
    container.appendChild(row);
  }

  function removeLinkRow(rowId) {
    const row = $(rowId);
    if (!row) return;
    const linkId = row.dataset.linkId;
    if (linkId) {
      // Existing link — mark for deletion
      row.style.opacity = "0.5";
      row.dataset.deleted = "true";
      row.querySelector(".delete-btn").textContent = "⌦ Reset";
      row.querySelector(".delete-btn").className = "reset-btn";
      row.querySelector(".delete-btn").onclick = () => {
        row.style.opacity = "1";
        row.dataset.deleted = "false";
        row.querySelector(".delete-btn").textContent = "⌫ Delete";
        row.querySelector(".delete-btn").className = "delete-btn";
        row.querySelector(".delete-btn").onclick = () => removeLinkRow(rowId);
      };
    } else {
      // New link — just remove
      row.remove();
    }
  }

  function updateLinkRow(rowId, value) {
    const row = $(rowId);
    if (!row) return;
    row.dataset.url = value;
    row.dataset.label = extractDomain(value);
    row.dataset.platform = "Other";
  }

  function extractDomain(url) {
    try {
      const u = new URL(url.startsWith("http") ? url : "https://" + url);
      return u.hostname.replace(/^www\\./, "");
    } catch {
      return url.replace(/^https?:\\/\\//, "").split("/")[0];
    }
  }

  function goToPayment() {
    $("step-editor").classList.add("hidden");
    $("step-payment").classList.remove("hidden");
  }

  // Bio counter
  $("edit-bio").addEventListener("input", e => {
    const bytes = new TextEncoder().encode(e.target.value).length;
    const remaining = 100 - bytes;
    const counter = $("bio-counter");
    if (remaining <= 20) {
      counter.classList.remove("hidden");
      counter.textContent = remaining < 0 ? "Over by " + Math.abs(remaining) + " bytes" : remaining + " bytes left";
      counter.className = remaining < 0
        ? "absolute bottom-2 right-3 text-xs text-red-600"
        : "absolute bottom-2 right-3 text-xs text-gray-500";
    } else {
      counter.classList.add("hidden");
    }
  });

  function collectProfileEdits() {
    const edits = {
      display_name: $("edit-display-name").value.trim() || null,
      bio: $("edit-bio").value.trim() || null,
      links: [],
    };

    // Collect link edits
    const rows = document.querySelectorAll("#links-container .link-row");
    rows.forEach(row => {
      const linkId = row.dataset.linkId;
      const url = row.dataset.url;
      const label = row.dataset.label;
      const platform = row.dataset.platform;
      const deleted = row.dataset.deleted === "true";

      if (deleted && linkId) {
        edits.links.push({ id: parseInt(linkId), _delete: true, url, label, platform });
      } else if (!deleted && url) {
        if (linkId) {
          edits.links.push({ id: parseInt(linkId), url, label, platform });
        } else {
          edits.links.push({ url, label, platform });
        }
      }
    });

    return edits;
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

    $("hidden-otp").value = otp;
    $("hidden-memo").value = memo;

    // Collect profile edits and add to form
    if (profileData) {
      const edits = collectProfileEdits();
      $("hidden-edits").value = JSON.stringify(edits);
    }

    $("verify-form").submit();
  }

  $("name-input").addEventListener("keypress", e => {
    if (e.key === "Enter") resolveName();
  });
  $("otp-input").addEventListener("keypress", e => {
    if (e.key === "Enter" && !$("btn-verify").disabled) verifyOTP();
  });
</script>
<form id="verify-form" method="POST" action="${safeAction}" class="hidden">
  <input type="hidden" name="action" value="verify">
  <input type="hidden" name="otp" id="hidden-otp">
  <input type="hidden" name="memo" id="hidden-memo">
  <input type="hidden" name="profile_edits" id="hidden-edits">
</form>
<form id="abort-form" method="POST" action="${safeAction}" class="hidden">
  <input type="hidden" name="action" value="abort">
</form>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}