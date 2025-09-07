import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";
import { slugify } from "./selectRandom.js";

// Close (X) icon
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function AddUserForm({ isOpen, onClose, onUserAdded }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAddress("");
      setError("");
      setIsLoading(false);
      // focus name on open
      setTimeout(() => dialogRef.current?.querySelector("#name")?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !address.trim()) {
      setError("Please fill in both name and address.");
      return;
    }
    setIsLoading(true);
    try {
      const s = slugify(name);
      const { data, error } = await supabase
        .from("zcasher")
        .insert([{ name: name.trim(), address: address.trim(), slug: s }])
        .select()
        .single();
      if (error) throw error;

      onUserAdded?.(data);
      onClose?.();
    } catch (err) {
      console.error("Add user failed:", err);
      setError(err?.message || "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-zcasher-title"
        className="relative w-full max-w-xl rounded-2xl border bg-white text-gray-900 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 id="add-zcasher-title" className="text-2xl font-semibold">
            Add New Zcasher
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl border bg-white hover:bg-gray-50 inline-flex items-center justify-center"
            aria-label="Close"
            type="button"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="Enter name"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
              Zcash Address
            </label>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="zs1..."
              autoComplete="off"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl border bg-white hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 h-11 rounded-2xl border bg-white hover:bg-gray-50 text-sm font-semibold disabled:opacity-60"
          >
            {isLoading ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}
