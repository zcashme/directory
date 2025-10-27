import { useState, useEffect, useMemo } from "react";
import { useFeedback } from "../store";

// Simple character counter
function CharCounter({ text }) {
  const remaining = 100 - text.length;
  const over = remaining < 0;
  return (
    <span
      className={`absolute bottom-2 right-2 text-xs ${
        over ? "text-red-600" : "text-gray-400"
      }`}
    >
      {over ? `-${-remaining} chars` : `+${remaining} chars`}
    </span>
  );
}

function HelpIcon({ text }) {
  const [show, setShow] = useState(false);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <div
      className="relative inline-block ml-1"
      onMouseEnter={() => !isTouch && setShow(true)}
      onMouseLeave={() => !isTouch && setShow(false)}
      onClick={() => isTouch && setShow((s) => !s)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold border border-gray-400 rounded-full text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
        ?
      </span>
      {show && (
        <div className="absolute z-20 w-48 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg shadow-md p-2 -right-1 top-5">
          {text}
        </div>
      )}
    </div>
  );
}


export default function ProfileEditor({ profile }) {
  const { setPendingEdit, pendingEdits } = useFeedback();

  // Normalize incoming DB links
  const originalLinks = useMemo(
    () =>
      (profile.links || []).map((l) => ({
        id: l.id ?? null,
        url: l.url ?? "",
        is_verified: !!l.is_verified,
        verification_expires_at: l.verification_expires_at || null,
        _uid: crypto.randomUUID(),
      })),
    [profile.links]
  );

  // Form state
  const [form, setForm] = useState({
    address: "",
    name: "",
    bio: "",
    profile_image_url: "",
    links:
      originalLinks.length > 0
        ? originalLinks.map((l) => ({ ...l }))
        : [
            {
              id: null,
              url: "",
              is_verified: false,
              verification_expires_at: null,
              _uid: crypto.randomUUID(),
            },
          ],
  });

  // Keep originals for placeholders
  const originals = useMemo(
    () => ({
      address: profile.address || "",
      name: profile.name || "",
      bio: profile.bio || "",
      profile_image_url: profile.profile_image_url || "",
    }),
    [profile]
  );

  // Dedupes while preserving order
  const uniq = (arr) => {
    const seen = new Set();
    const out = [];
    for (const t of arr) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  };

  // Append token helper
  const appendLinkToken = (token) => {
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const next = prev.includes(token) ? prev : [...prev, token];
    setPendingEdit("l", next);
  };

  // Remove token helper
  const removeLinkToken = (token) => {
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const next = prev.filter((t) => t !== token);
    setPendingEdit("l", next);
  };

  // Profile field diffs
  useEffect(() => {
    const changed = {};
    if (form.address && form.address.trim() !== "" && form.address !== originals.address)
      changed.address = form.address;
    if (form.name && form.name.trim() !== "" && form.name !== originals.name)
      changed.name = form.name;
    if (form.bio && form.bio.trim() !== "" && form.bio !== originals.bio)
      changed.bio = form.bio;
    if (
      form.profile_image_url &&
      form.profile_image_url.trim() !== "" &&
      form.profile_image_url !== originals.profile_image_url
    )
      changed.profile_image_url = form.profile_image_url;

    const changedStr = JSON.stringify(changed);
    if (ProfileEditor._lastPending !== changedStr) {
      ProfileEditor._lastPending = changedStr;
      setPendingEdit("profile", changed);
    }
  }, [form.address, form.name, form.bio, form.profile_image_url, originals, setPendingEdit]);

// Compute link tokens
useEffect(() => {
  const effectTokens = [];
  const originalByUrl = new Map();
  const originalUrlSet = new Set();

  for (const l of originalLinks) {
    if (!l || !l.url) continue;
    originalByUrl.set(l.url, l.id || null);
    originalUrlSet.add(l.url);
  }

  // Current state
  const currentUrls = new Set(
    form.links.map((l) => (l.url || "").trim()).filter(Boolean)
  );

  // Removals: original no longer present
  for (const l of originalLinks) {
    const url = (l.url || "").trim();
    if (!url) continue;
    if (!currentUrls.has(url)) effectTokens.push(l.id ? `-${l.id}` : `-${url}`);
  }

  // Prepare a copy of pendingEdits.l for normalization
  let normalizedVerify = Array.isArray(pendingEdits?.l)
    ? [...pendingEdits.l]
    : [];

  // Normalize +! tokens when the user edits a pending verified new link
  for (const token of pendingEdits?.l || []) {
    if (!token.startsWith("+!")) continue;
    const oldUrl = token.slice(2);
    const stillExists = form.links.some(
      (l) => l.url.trim() === oldUrl.trim()
    );

    if (!stillExists) {
      // Remove old +! token
      normalizedVerify = normalizedVerify.filter((t) => t !== token);
      // Find the new link (not in originalLinks) to replace it
      const newUrl = form.links
        .map((l) => l.url.trim())
        .find((u) => u && !originalUrlSet.has(u));
      if (newUrl) normalizedVerify.push(`+!${newUrl}`);
    }
  }

  // Additions and new-link verifications
  for (const row of form.links) {
    const url = (row.url || "").trim();
    if (!url) continue;
    const isNew = !row.id && !originalUrlSet.has(url);
    const verifyToken = `+!${url}`;
    const isExplicitVerify = normalizedVerify.includes(verifyToken);

    if (isNew) {
      if (isExplicitVerify) {
        effectTokens.push(verifyToken);
      } else {
        effectTokens.push(`+${url}`);
      }
    }
  }

  // Explicit verification tokens
  const explicitVerify = normalizedVerify.filter(
    (t) => /^![0-9]+$/.test(t) || /^\+!/.test(t)
  );

  // Deduped union
  const uniq = (arr) => {
    const seen = new Set();
    const out = [];
    for (const t of arr) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  };

  const merged = uniq([...effectTokens, ...explicitVerify]);

  // Cleanup: remove verify tokens that refer to removed links
  const filtered = merged.filter((t) => {
    if (!/^!/.test(t) && !/^\+!/.test(t)) return true;

    if (t.startsWith("!")) {
      const id = t.slice(1);
      return !merged.includes(`-${id}`);
    }

    if (t.startsWith("+!")) {
      const url = t.slice(2);
      if (!url) return false;
      return !merged.includes(`-${url}`);
    }

    return true;
  });

  const serialized = JSON.stringify(filtered);
  if (ProfileEditor._lastLinks !== serialized) {
    ProfileEditor._lastLinks = serialized;
    setPendingEdit("l", filtered);
  }
}, [form.links, originalLinks, pendingEdits?.l, setPendingEdit]);


  // Handlers
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleLinkChange = (uid, value) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l._uid === uid ? { ...l, url: value } : l)),
    }));
  };

  const addLink = () =>
    setForm((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          id: null,
          url: "",
          is_verified: false,
          verification_expires_at: null,
          _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid) =>
    setForm((prev) => {
      const removed = prev.links.find((l) => l._uid === uid);
      const links = prev.links.filter((l) => l._uid !== uid);
      if (removed?.id) appendLinkToken(`-${removed.id}`);
      return { ...prev, links };
    });

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [
              {
                id: null,
                url: "",
                is_verified: false,
                verification_expires_at: null,
                _uid: crypto.randomUUID(),
              },
            ],
    }));

    // clear link tokens only
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const filtered = prev.filter(
      (t) => !/^[-+!]/.test(t) && !/^\+!/.test(t)
    );
    setPendingEdit("l", filtered);
  };

  const isPendingToken = (token) =>
    Array.isArray(pendingEdits?.l) && pendingEdits.l.includes(token);

  return (
<div className="w-full -mx-6 -mb-1 bg-transparent text-left text-sm text-gray-800 overflow-visible">
<div className="bg-transparent  overflow-hidden">
      <p className="text-sm text-gray-400 text-center">
                <br></br>
    </p>
     
      {/* Address */}
      <div className="mb-3">
<label className="block font-semibold text-gray-700 mb-1 flex items-center justify-between">
  <span>Zcash Address</span>
  <HelpIcon text="Your Zcash address where verification codes are sent." />
</label>
        <input
          type="text"
          value={form.address}
          placeholder={originals.address}
          onChange={(e) => handleChange("address", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 font-mono text-sm placeholder-gray-400"
        />
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="block font-semibold text-gray-700 mb-1 flex items-center justify-between">
  <span>Name</span>
  <HelpIcon text="Your public display name for this profile." />
</label>

        <input
          type="text"
          value={form.name}
          placeholder={originals.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400"
        />
      </div>

      {/* Bio */}
      <div className="mb-3 relative">
<label className="block font-semibold text-gray-700 mb-1 flex items-center justify-between">
  <span>Biography</span>
  <HelpIcon text="Your current story arc in 100 characters or less." />
</label>
        <textarea
          rows={3}
          maxLength={100}
          value={form.bio}
          placeholder={originals.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full resize-none overflow-hidden pr-8 pb-6 relative text-left whitespace-pre-wrap break-words"
        />
        <CharCounter text={form.bio} />
      </div>

      {/* Image URL */}
      <div className="mb-3">
<label className="block font-semibold text-gray-700 mb-1 flex items-center justify-between">
  <span>Profile Image URL</span>
  <HelpIcon text="Link to PNG or JPG. Search 'free image link host'.  Try remove.bg & compresspng.com. " />
</label>
        <input
          type="text"
          value={form.profile_image_url}
          placeholder={originals.profile_image_url}
          onChange={(e) => handleChange("profile_image_url", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-400"
        />
      </div>

{/* Links */}
{/* Links */}
<div className="mb-4">
  <div className="flex justify-between items-center mb-1">
    <label className="block font-semibold text-gray-700">Links</label>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={resetLinks}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
      >
        Reset
      </button>
      <HelpIcon text="Link verification requires OTP. Verified links cannot be changed." />
    </div>
  </div>
    </div>



        {form.links.map((row) => {
          const original = originalLinks.find((o) => o.id === row.id) || {};
          const isVerified = !!original?.is_verified;
          const canVerify = !!profile.address_verified;

          const token = row.id ? `!${row.id}` : row.url.trim() ? `+!${row.url.trim()}` : null;
          const isPending = token && isPendingToken(token);

          return (
            <div key={row._uid} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <input
                type="text"
                value={row.url}
                placeholder={original?.url || "example.com"}
                onChange={(e) => handleLinkChange(row._uid, e.target.value)}
                readOnly={isVerified}
                className={`flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono ${
                  isVerified
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "border-gray-300 focus:border-blue-500"
                } placeholder-gray-400`}
              />

              <div className="flex items-center gap-2">
                {!canVerify ? (
                  <span className="text-xs text-gray-500 italic">
                    Link verification – verify your Zcash address first
                  </span>
                ) : isVerified ? (
                  <button
                    type="button"
                    disabled
                    className="text-xs px-2 py-1 text-green-700 border border-green-400 rounded opacity-60 cursor-not-allowed"
                  >
                    Verified
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) return;
                      if (isPending) removeLinkToken(token);
                      else appendLinkToken(token);
                    }}
                    className={`text-xs px-2 py-1 border rounded ${
                      isPending
                        ? "text-yellow-700 border-yellow-400 bg-yellow-50"
                        : "text-blue-600 border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {isPending ? "Pending" : "Verify"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeLink(row._uid)}
                  className="text-xs text-red-600 hover:underline"
                >
                  ⌫ Remove Link
                </button>
              </div>
            </div>
            
          );
        })}

        <button
          type="button"
          onClick={addLink}
          className="text-sm font-semibold text-blue-700 hover:underline mt-1"
        >
          ＋ Add Link
        </button>
      </div>
      <p className="text-sm text-gray-400 text-left">
                <br></br>To submit changes, send the message below and enter the code you receive. 
        <br></br>        <br></br>
    </p>
    </div>
  );
}
