import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Simple URL validation
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AddUserForm({ isOpen, onClose, onUserAdded }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [referrer, setReferrer] = useState("");
  const [links, setLinks] = useState([{ url: "", valid: true }]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setAddress("");
    setReferrer("");
    setLinks([{ url: "", valid: true }]);
    setError("");
    setIsLoading(false);

    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("public_profile")
        .select("name")
        .order("name", { ascending: true });
      if (!error && data) setProfiles(data);
    }
    fetchProfiles();

    setTimeout(() => dialogRef.current?.querySelector("#name")?.focus(), 50);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleLinkChange(index, value) {
    const updated = [...links];
    updated[index].url = value;
    updated[index].valid = !value || isValidUrl(value);
    setLinks(updated);
  }

  function addLinkField() {
    setLinks([...links, { url: "", valid: true }]);
  }

  function removeLinkField(index) {
    setLinks(links.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !address.trim()) {
      setError("Please fill in both name and address.");
      return;
    }

    const invalidLink = links.some((l) => l.url && !l.valid);
    if (invalidLink) {
      setError("One or more links are invalid. Please fix them before continuing.");
      return;
    }

    // create slug for local use (not inserted)
    const slug = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // store links locally for now (until a column exists)
    const validLinks = links
      .map((l) => l.url.trim())
      .filter((url) => url && isValidUrl(url));

    if (validLinks.length) {
      localStorage.setItem(`links_${slug}`, JSON.stringify(validLinks));
    }

    setIsLoading(true);
    try {
      // ✅ insert only the valid fields from current schema
      const { data, error } = await supabase
        .from("public_profile")
        .insert([
          {
            name: name.trim(),
            address: address.trim(),
            referred_by: referrer || null,
            since: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      onUserAdded?.(data);
      onClose?.();
    } catch (err) {
      console.error("Add name failed:", err);
      setError(err?.message || "Failed to add name.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">＋ Zcash is better with friends</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
            >
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-transparent"
              placeholder="Enter name"
              autoComplete="off"
            />
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
            >
              Zcash Address
            </label>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm font-mono outline-none focus:border-blue-600 bg-transparent"
              placeholder="zs1..."
              autoComplete="off"
            />
          </div>

          {/* Referrer Dropdown */}
          <div>
            <label
              htmlFor="referrer"
              className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
            >
              Referred by Zcash.me/
            </label>
            <select
              id="referrer"
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-transparent"
            >
              <option value="">— None —</option>
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Links Section */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
              Links (optional)
            </label>
            {links.map((link, index) => (
              <div key={index} className="mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    placeholder="https://example.com"
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-mono bg-transparent outline-none ${
                      link.valid
                        ? "border-black/30 focus:border-blue-600"
                        : "border-red-400 focus:border-red-500"
                    }`}
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLinkField(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-semibold"
                    >
                      ⛌
                    </button>
                  )}
                </div>
                {!link.valid && (
                  <p className="text-xs text-red-600 mt-1 ml-1">
                    Invalid URL. Must start with http:// or https://
                  </p>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLinkField}
              className="text-sm font-semibold text-blue-700 hover:underline mt-1"
            >
              ＋ Add another link
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-black/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-black/30 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-black/30 text-sm font-semibold text-blue-700 hover:border-blue-600 hover:bg-blue-50 disabled:opacity-60"
          >
            {isLoading ? "Adding..." : "Add Name"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn .25s ease-out; }
      `}</style>
    </div>
  );
}
