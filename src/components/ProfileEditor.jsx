import { useState, useEffect, useMemo } from "react";
import { useFeedback } from "../store";
import LinkInput from "../components/LinkInput"; 
import CheckIcon from "../assets/CheckIcon.jsx";
import { isValidUrl } from "../utils/validateUrl";

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
  onMouseEnter={(e) => {
    e.stopPropagation();
    !isTouch && setShow(true);
  }}
  onMouseLeave={(e) => {
    e.stopPropagation();
    !isTouch && setShow(false);
  }}
  onClick={(e) => {
    e.stopPropagation();
    isTouch && setShow((s) => !s);
  }}
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


export default function ProfileEditor({ profile, links }) {
//  console.log("DEBUG incoming profile.links =", profile.links, "links prop =", links);
  const { setPendingEdits, pendingEdits } = useFeedback();


  // Normalize incoming DB links
const originalLinks = useMemo(() => {
  const arr = Array.isArray(links) ? links : Array.isArray(profile.links) ? profile.links : [];
  return arr.map((l) => ({
    id: l.id ?? null,
    url: l.url ?? "",
    is_verified: !!l.is_verified,
    verification_expires_at: l.verification_expires_at || null,
    _uid: crypto.randomUUID()
  }));
}, [profile, links]);

  // Form state
const [form, setForm] = useState({
    address: "",
    name: "",
    bio: "",
    profile_image_url: "",
    links: originalLinks.map((l) => ({ ...l })),
});

const [deletedFields, setDeletedFields] = useState({
    address: false,
    name: false,
    bio: false,
    profile_image_url: false,
});

useEffect(() => {
  // auto reset links when profile or links prop changes
  setForm((prev) => ({
    ...prev,
    links: originalLinks.map((l) => ({ ...l })),
  }));
}, [originalLinks]);

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
    setPendingEdits("l", next);
  };

  // Remove token helper
  const removeLinkToken = (token) => {
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const next = prev.filter((t) => t !== token);
    setPendingEdits("l", next);
  };

// Profile field diffs including deletions
useEffect(() => {
    const changed = {};

    // normal changed fields
    if (!deletedFields.address && form.address && form.address.trim() !== "" && form.address !== originals.address)
      changed.address = form.address;
    if (!deletedFields.name && form.name && form.name.trim() !== "" && form.name !== originals.name)
      changed.name = form.name;
    if (!deletedFields.bio && form.bio && form.bio.trim() !== "" && form.bio !== originals.bio)
      changed.bio = form.bio;
    if (
      !deletedFields.profile_image_url &&
      form.profile_image_url &&
      form.profile_image_url.trim() !== "" &&
      form.profile_image_url !== originals.profile_image_url
    )
      changed.profile_image_url = form.profile_image_url;

    // deletion tokens
// deleted fields go into d:[]
const deleted = [];

if (deletedFields.address) deleted.push("a");
if (deletedFields.name) deleted.push("n");
if (deletedFields.bio) deleted.push("b");
if (deletedFields.profile_image_url) deleted.push("i");

if (deleted.length > 0) {
  changed.d = deleted;
} else {
  delete changed.d;
}


    const changedStr = JSON.stringify(changed);
    if (ProfileEditor._lastPending !== changedStr) {
      ProfileEditor._lastPending = changedStr;
      setPendingEdits("profile", changed);
    }
}, [
    form.address,
    form.name,
    form.bio,
    form.profile_image_url,
    originals.address,
    originals.name,
    originals.bio,
    originals.profile_image_url,
    deletedFields.address,
    deletedFields.name,
    deletedFields.bio,
    deletedFields.profile_image_url,
    setPendingEdits
]);
// Compute link tokens
useEffect(() => {
  const effectTokens = [];

  // Index originals by id and remember their urls
  const originalById = new Map();
  const originalUrlSet = new Set();

  for (const l of originalLinks) {
    if (!l) continue;
    const url = (l.url || "").trim();
    if (l.id) originalById.set(l.id, { ...l, url });
    if (url) originalUrlSet.add(url);
  }

  const currentUrls = new Set(
    form.links.map((l) => (l.url || "").trim()).filter(Boolean)
  );

  // Start from existing link tokens
  let normalizedVerify = Array.isArray(pendingEdits?.l)
    ? [...pendingEdits.l]
    : [];

  // Normalize +! tokens when the user edits a pending verified new link
  for (const token of pendingEdits?.l || []) {
    if (!token.startsWith("+!")) continue;
    const oldUrl = token.slice(2);
    const stillExists = form.links.some(
      (l) => (l.url || "").trim() === oldUrl.trim()
    );

    if (!stillExists) {
      // remove old +! token
      normalizedVerify = normalizedVerify.filter((t) => t !== token);
      // find a new, non-original url to move the +! onto
      const newUrl = form.links
        .map((l) => (l.url || "").trim())
        .find((u) => u && !originalUrlSet.has(u));
      if (newUrl) normalizedVerify.push(`+!${newUrl}`);
    }
  }

  // Apply your rules:
  // - -id only when an existing link is removed or cleared
  // - +id:newUrl when an existing link is edited
  // - +url when a brand new link is created
  for (const row of form.links) {
    const id = row.id ?? null;
    const newUrlRaw = (row.url || "").trim();
const { valid: urlValid } = isValidUrl(newUrlRaw);
const newUrl = urlValid ? newUrlRaw : "";   // invalid URLs are treated as blank

    if (id) {
      const original = originalById.get(id);
      const originalUrl = original ? original.url : "";

      if (newUrl === originalUrl) {
        // unchanged existing link
        continue;
      }

if (!newUrl) {
    // If invalid, treat it as empty but DO NOT delete verified links
    effectTokens.push(`-${id}`);
    continue;
}


      // existing link edited
      effectTokens.push(`+${id}:${newUrl}`);
    } else {
      // new link row
      if (!newUrl) continue;

      const isNew = !originalUrlSet.has(newUrl);
      const verifyToken = `+!${newUrl}`;
      const isExplicitVerify = normalizedVerify.includes(verifyToken);

      if (isNew && !isExplicitVerify) {
        // new link added
        effectTokens.push(`+${newUrl}`);
      }
    }
  }

  // Preserve all existing tokens EXCEPT ones we explicitly normalize away.
  // (This keeps -id and +url tokens from being discarded when adding a new blank row.)


const preservedOld = Array.isArray(normalizedVerify)
  ? normalizedVerify.filter((t) => {
      // explicit verification tokens
      if (/^![0-9]+$/.test(t) || /^\+!/.test(t)) return true;

      // removal tokens
      if (/^-[0-9]+$/.test(t)) return true;

// existing-link edit tokens — KEEP ONLY the latest edit for this id
if (/^\+[0-9]+:/.test(t)) {
  const id = t.slice(1, t.indexOf(":"));
  // discard old edits if a new +id:newUrl exists in effectTokens
  const hasNewer = effectTokens.some(et => et.startsWith(`+${id}:`));
  return !hasNewer;
}


      // new-link tokens: keep ONLY if this URL still exists AND is not explicitly verified
      if (/^\+[^!]/.test(t) && !t.includes(":")) {
          const url = t.slice(1).trim();
          const hasExplicitVerify = normalizedVerify.includes(`+!${url}`);
          return currentUrls.has(url) && !hasExplicitVerify;
      }


      return false;
    })
  : [];

  const uniqTokens = (arr) => {
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

  // Union of new effect tokens and preserved old tokens
  const merged = uniqTokens([...effectTokens, ...preservedOld]);

  // Cleanup:
  // - drop !id when there is a -id
  // - drop +!url when that url no longer exists in current form.links
  const filtered = merged.filter((t) => {
    if (t.startsWith("!")) {
      const id = t.slice(1);
      return !merged.includes(`-${id}`);
    }

    if (t.startsWith("+!")) {
      const url = (t.slice(2) || "").trim();
      if (!url) return false;
      return currentUrls.has(url);
    }

    return true;
  });

  const serialized = JSON.stringify(filtered);
  if (ProfileEditor._lastLinks !== serialized) {
    ProfileEditor._lastLinks = serialized;
    setPendingEdits("l", filtered);
  }
}, [form.links, originalLinks, pendingEdits?.l, setPendingEdits]);


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
    setPendingEdits("l", filtered);
  };

  const isPendingToken = (token) =>
    Array.isArray(pendingEdits?.l) && pendingEdits.l.includes(token);

  return (
    
<div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
<div className="w-full max-w-xl bg-transparent overflow-hidden">

  {/* Header */}
  <div className="px-1 pb-3 mb-4 border-b border-black/10">
    <h2 className="text-base font-semibold text-gray-800 text-center">
      Edit Profile
    </h2>
  </div>
     
{/* Address */}
{/* ZCASH ADDRESS */}
<div className="mb-3 text-center">

  <div className="mb-1 flex items-center justify-between">
    <label htmlFor="addr" className="font-semibold text-gray-700">
      Zcash Address
    </label>

    <div className="flex items-center gap-3">
      <div className="relative inline-block">
        <button
          type="button"
          onClick={(e) => {
            if (!profile.address_verified) {
              const btn = e.currentTarget;
              const popup = e.currentTarget.nextElementSibling;

              btn.classList.remove("shake");
              void btn.offsetWidth;
              btn.classList.add("shake");

              popup.classList.add("show");
              clearTimeout(popup._timer);
              popup._timer = setTimeout(() => {
                popup.classList.remove("show");
              }, 3000);

              return;
            }

            setDeletedFields((prev) => {
              const next = !prev.address;
              if (next) {
                setForm((f) => ({ ...f, address: "" }));
              } else {
                setForm((f) => ({ ...f, address: originals.address }));
              }
              return { ...prev, address: next };
            });
          }}
          className={`text-xs underline font-normal ${
            profile.address_verified
              ? deletedFields.address
                ? "text-green-700"
                : "text-red-600"
              : "text-gray-400 cursor-not-allowed"
          }`}
        >
          {deletedFields.address ? "⌦ Reset" : "⌫ Delete"}
        </button>

        <div className="absolute fade-popup z-50 w-90 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs right-0 bottom-full mb-1">
          Cannot change unverified address. <br /> Lost access? Create new profile.
        </div>
      </div>

      <HelpIcon text="Your Zcash address where verification codes are sent." />
    </div>
  </div>

  <input
    id="addr"
    type="text"
    value={form.address}
    placeholder={originals.address}
    onChange={(e) => handleChange("address", e.target.value)}
    className="w-full border rounded-lg px-3 py-2 font-mono text-sm placeholder-gray-400"
  />
</div>


{/* NAME */}
<div className="mb-3">

  <div className="mb-1 flex items-center justify-between">
    <label htmlFor="name" className="font-semibold text-gray-700">
      Name
    </label>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() =>
          setDeletedFields((prev) => {
            const next = !prev.name;
            if (next) {
              setForm((f) => ({ ...f, name: "" }));
            } else {
              setForm((f) => ({ ...f, name: originals.name }));
            }
            return { ...prev, name: next };
          })
        }
        className={`text-xs underline font-normal ${
          deletedFields.name ? "text-green-700" : "text-red-600"
        }`}
      >
        {deletedFields.name ? "⌦ Reset" : "⌫ Delete"}
      </button>

      <HelpIcon text="Your public display name for this profile." />
    </div>
  </div>

  <input
    id="name"
    type="text"
    value={form.name}
    placeholder={originals.name}
    onChange={(e) => handleChange("name", e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400"
  />
</div>


{/* BIOGRAPHY */}
<div className="mb-3 relative">

  <div className="mb-1 flex items-center justify-between">
    <label htmlFor="bio" className="font-semibold text-gray-700">
      Biography
    </label>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() =>
          setDeletedFields((prev) => {
            const next = !prev.bio;
            if (next) {
              setForm((f) => ({ ...f, bio: "" }));
            } else {
              setForm((f) => ({ ...f, bio: originals.bio }));
            }
            return { ...prev, bio: next };
          })
        }
        className={`text-xs underline ${
          deletedFields.bio ? "text-green-700" : "text-red-600"
        }`}
      >
        {deletedFields.bio ? "⌦ Reset" : "⌫ Delete"}
      </button>

      <HelpIcon text="Your current story arc in 100 characters or less." />
    </div>
  </div>

  <textarea
    id="bio"
    rows={3}
    maxLength={100}
    value={form.bio}
    placeholder={originals.bio}
    onChange={(e) => handleChange("bio", e.target.value)}
    className="border rounded-lg px-3 py-2 text-sm w-full resize-none overflow-hidden pr-8 pb-6 relative text-left whitespace-pre-wrap break-words"
  />
  <CharCounter text={form.bio} />
</div>


{/* PROFILE IMAGE URL */}
<div className="mb-3">

  <div className="mb-1 flex items-center justify-between">
    <label htmlFor="pimg" className="font-semibold text-gray-700">
      Profile Image URL
    </label>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() =>
          setDeletedFields((prev) => {
            const next = !prev.profile_image_url;
            if (next) {
              setForm((f) => ({ ...f, profile_image_url: "" }));
            } else {
              setForm((f) => ({ ...f, profile_image_url: originals.profile_image_url }));
            }
            return { ...prev, profile_image_url: next };
          })
        }
        className={`text-xs underline font-normal ${
          deletedFields.profile_image_url ? "text-green-700" : "text-red-600"
        }`}
      >
        {deletedFields.profile_image_url ? "⌦ Reset" : "⌫ Delete"}
      </button>

      <HelpIcon text="Link to PNG or JPG. Search 'free image link host'. Try remove.bg & compresspng.com." />
    </div>
  </div>

  <input
    id="pimg"
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
        className={`text-xs font-semibold underline ${
          JSON.stringify(form.links.map(l => ({id:l.id,url:l.url}))) !==
          JSON.stringify(originalLinks.map(l => ({id:l.id,url:l.url})))
            ? "text-green-700"
            : "text-gray-500"
        }`}
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
<LinkInput
  value={row.url}
  onChange={(v) => handleLinkChange(row._uid, v)}
  readOnly={isVerified}
  placeholder={original?.url || "example.com"}
/>


              <div className="flex items-center gap-2">
                {!canVerify ? (
                  <span className="text-xs text-gray-500 italic">
                    Verify uaddr then URLs
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
                  ⌫ Delete 
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


{/* Footer */}
<div className="mt-8 pt-4 border-t border-black/10">
  <p className="text-sm text-gray-400 text-center">
    <span className="inline-flex items-center gap-1">
      ⛉
      <span className="font-semibold">Verify</span> address to approve changes.
    </span>
  </p>
</div>


      </div>
      <p className="text-sm text-gray-400 text-center mt-4">

    </p>

    
    </div>
    
  );
}
