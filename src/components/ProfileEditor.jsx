import { useState, useEffect } from "react";
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
  const [form, setForm] = useState({
    address: profile.address || "",
    name: profile.name || "",
    bio: profile.bio || "",
    profile_image_url: profile.profile_image_url || "",
    links: profile.links?.map((l) => l.url) || [""],
  });

  // Auto-sync pending edits to store
  useEffect(() => {
    setPendingEdit("profile", form);
  }, [form, setPendingEdit]);

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
          onChange={(e) => handleChange("address", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
        />
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="block font-semibold text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
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
          onChange={(e) => handleChange("bio", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none pr-16"
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
          onChange={(e) => handleChange("profile_image_url", e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
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
              onChange={(e) => handleLinkChange(i, e.target.value)}
              placeholder="https://example.com"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono border-gray-300 focus:border-blue-500"
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
        (Changes auto-save locally and update your sign-in form in real time.)
      </p>
    </div>
  );
}
