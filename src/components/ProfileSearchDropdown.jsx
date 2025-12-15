import { useState, useEffect } from "react";
import { useFeedback } from "../store";
import VerifiedBadge from "./VerifiedBadge";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileSearchDropdown({
  value,
  onChange,
  profiles,
  placeholder = "Search",
  listOnly = false,
}) {
  const [show, setShow] = useState(false);

  // This is the only global sync we need
  const { setSelectedAddress } = useFeedback();

  const filtered = value
    ? profiles.filter((p) =>
      p.name?.toLowerCase().includes(value.toLowerCase())
    )
    : [];

  useEffect(() => {
    if (!value) setShow(false);
  }, [value]);

  return (
    <div className="w-full">
      {/* Input only if NOT list-only */}
      {!listOnly && (
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400"
        />
      )}

      {/* Dropdown menu */}
      {(listOnly || show) && value && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#0a1126]/80 bg-[#0a1126]/90 backdrop-blur-md shadow-xl w-full">
          {filtered.length > 0 ? (
            filtered.slice(0, 20).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p);
                  if (p.address) setSelectedAddress(p.address);
                  setShow(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-white font-semibold hover:bg-[#060b17]/95 transition-colors"
              >
                {/* Avatar (fixed priority) */}
                <ProfileAvatar
                  profile={p}
                  size={32}
                  imageClassName="object-cover"
                />

                {/* Text + metadata (flex priority zone) */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Name (highest priority text) */}
                  <span className="truncate flex-shrink-0">
                    {p.name}
                  </span>

                  {(p.address_verified ||
                    p.zcasher_links?.some((l) => l.is_verified)) && (
                      <VerifiedBadge profile={p} />
                    )}

                  {/* Address (lowest priority, truncates first) */}
                  {p.address && (
                    <span className="text-xs opacity-60 whitespace-nowrap truncate max-w-[120px] flex-shrink">
                      {p.address.slice(0, 6)}...{p.address.slice(-6)}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-white/90 font-medium">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
