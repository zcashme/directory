import { useState, useEffect, useMemo } from "react";
import { useFeedback } from "../store";

// Simple character counter (replaces old byte logic)
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

export default function ProfileEditor({ profile }) {
  const { setPendingEdit } = useFeedback();

  // ✅ all fields start empty
  const [form, setForm] = useState({
    address: "",
    name: "",
    bio: "",
    profile_image_url: "",
    links: profile.links?.map(() => "") || [""],
  });

  // keep originals for placeholder display
  const originals = useMemo(
    () => ({
      address: profile.address || "",
      name: profile.name || "",
      bio: profile.bio || "",
      profile_image_url: profile.profile_image_url || "",
      links: profile.links?.map((l) => l.url) || [],
    }),
    [profile]
  );

  // ✅ only include changed fields in pendingEdits (guarded to avoid render loop)
useEffect(() => {
  const changed = {};

  Object.entries(form).forEach(([key, value]) => {
    if (key === "links") {
      const diffLinks = value.filter(
        (v, i) => v && v.trim() !== "" && v !== originals.links[i]
      );
      if (diffLinks.length > 0) changed.links = diffLinks;
    } else if (value && value.trim() !== "" && value !== originals[key]) {
      changed[key] = value;
    }
  });

  // Compare to last pending edit snapshot to avoid infinite loops
  const changedStr = JSON.stringify(changed);
  if (ProfileEditor._lastPending !== changedStr) {
    ProfileEditor._lastPending = changedStr;
    setPendingEdit("profile", changed);
  }
}, [form, originals, setPendingEdit]);


  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLinkChange = (index, value) => {
    const updated = [...form.links];
    updated[index] = value;
    setForm((prev) => ({ ...prev, links: updated }));
  };

  const addLink = () =>
    setForm((prev) => ({ ...prev, links: [...prev.links, ""] }));

  const removeLink = (index) =>
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));

  return (
    <div className="w-full max-w-sm bg-white/70 rounded-xl border border-gray-200 shadow-sm p-4 text-left text-sm text-gray-800 overflow-visible">
      {/* Zcash Address */}
      <div className="mb-3">
        <label className="block font-semibold text-gray-700 mb-1">
          Zcash Address
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
        <label className="block font-semibold text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          placeholder={originals.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm placeholder-gray-400"
        />
      </div>

      {/* Bio with char counter */}
      <div className="mb-3 relative">
        <label className="block font-semibold text-gray-700 mb-1">
          Bio (max 100 chars)
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

      {/* Profile Image URL */}
      <div className="mb-3">
        <label className="block font-semibold text-gray-700 mb-1">
          Profile Image URL
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
      <div className="mb-4">
        <label className="block font-semibold text-gray-700 mb-1">Links</label>
        {form.links.map((url, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={url}
              placeholder={originals.links[i] || "https://example.com"}
              onChange={(e) => handleLinkChange(i, e.target.value)}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono border-gray-300 focus:border-blue-500 placeholder-gray-400"
            />
            {form.links.length > 1 && (
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="text-xs text-red-600 hover:underline"
              >
                ✖
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addLink}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ＋ Add Link
        </button>
      </div>

      <p className="text-xs text-gray-400">
        To apply these changes to your profile, submit the Verification Request
        below.
      </p>
    </div>
  );
}
