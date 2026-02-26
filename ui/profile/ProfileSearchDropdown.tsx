import { useState, useEffect, useRef } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useDebounce } from "use-debounce";
import type { Profile } from "@/lib/profile/types";
import { getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import { toProfile, type DirectoryApiResponse } from "@/lib/directory/directoryClient";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import Spinner from "@/ui/common/feedback/Spinner";
import { withFieldBorderState } from "@/ui/common/forms/styles";

const fmtUsername = (p: Partial<Profile>) =>
  getUsernameWithDiscriminator(p).replace(/\s+/g, "_");

const displayName = (p: Partial<Profile>) =>
  p.display_name || p.name || "";

/** Highlight the first occurrence of `query` inside `text` (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-[var(--color-brand-blue)]">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Dropdown animation
// ---------------------------------------------------------------------------

const dropdownMotion = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileSearchDropdownProps {
  value: string;
  onChange: (value: string | Profile) => void; // eslint-disable-line no-unused-vars
  placeholder?: string;
  showByDefault?: boolean;
  onClaimClick?: (username: string) => void; // eslint-disable-line no-unused-vars
  showUsernameAvailability?: boolean;
  className?: string;
}

export default function ProfileSearchDropdown({
  value,
  onChange,
  placeholder = "Search",
  showByDefault = true,
  onClaimClick,
  showUsernameAvailability = true,
  className = `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`,
}: ProfileSearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dismissedRef = useRef(false);

  // Debounce the search value — keystrokes update the input instantly,
  // but API calls only fire after 150 ms of silence.
  const [debouncedValue] = useDebounce(value, 150);
  const query = debouncedValue?.trim() || "";

  // ------- Fetch on debounced query change -------
  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    if (!query) {
      setResults([]);
      setLoading(false);
      setUsernameAvailable(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetch(`/api/directory?q=${encodeURIComponent(query)}&limit=5`, {
      signal: controller.signal,
      headers: { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "" },
    })
      .then((res) => (res.ok ? res.json() : { results: [], next_cursor: null }))
      .then((api: DirectoryApiResponse) => {
        if (controller.signal.aborted) return;

        const profiles = api.results.map(toProfile);
        const exists = api.exists ?? false;

        setResults(profiles);
        setLoading(false);

        if (showUsernameAvailability && !exists) {
          setUsernameAvailable(query);
        } else {
          setUsernameAvailable(null);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLoading(false);
        setUsernameAvailable(null);
      });

    return () => controller.abort();
  }, [query, showUsernameAvailability]);

  // ------- Dropdown visibility -------
  useEffect(() => {
    if (!value?.trim()) { setShow(false); dismissedRef.current = false; return; }
    if (dismissedRef.current) return;
    if (showByDefault || usernameAvailable) setShow(true);
  }, [value, showByDefault, usernameAvailable]);

  // ------- Dismiss (click-outside + Escape) -------
  useEffect(() => {
    if (!show && !usernameAvailable) return;
    const dismiss = () => {
      dismissedRef.current = true;
      setShow(false);
      setUsernameAvailable(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [show, usernameAvailable]);

  const dropdownVisible = (show || usernameAvailable) && !!value?.trim();
  const hasContent = results.length > 0 || usernameAvailable || loading;

  return (
    <div ref={containerRef}>
      <Command shouldFilter={false}>
        <Command.Input
          value={value}
          onValueChange={(v) => {
            dismissedRef.current = false;
            onChange(v);
            setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          style={{ outline: "none" }}
        />

        <AnimatePresence>
          {dropdownVisible && hasContent && (
            <motion.div {...dropdownMotion}>
              <Command.List className="absolute left-0 top-full z-[1001] mt-1 max-h-60 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-xl">

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center justify-center py-3">
                    <Spinner size="xs" color="gray" />
                  </div>
                )}

                {/* Username availability banner */}
                {usernameAvailable && (
                  <Command.Item
                    value="available"
                    forceMount
                    onSelect={() => usernameAvailable && onClaimClick?.(usernameAvailable)}
                    className="px-3 py-2 text-sm text-gray-800 font-medium border-b border-gray-100 cursor-pointer transition-colors bg-green-50/50 data-[selected=true]:bg-green-100/60 hover:bg-green-100/50"
                  >
                    <span className="font-semibold text-green-700">/{usernameAvailable}</span>{" "}
                    is available!
                  </Command.Item>
                )}

                {/* Results */}
                {results.map((p) => (
                  <Command.Item
                    key={`${p.name}-${p.id}`}
                    value={`profile-${p.id}`}
                    onSelect={() => { onChange(p); setShow(false); }}
                    className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-gray-800 font-semibold transition-colors hover:bg-gray-50 data-[selected=true]:bg-gray-100"
                  >
                    <ProfileAvatar profile={p} size={32} imageClassName="object-cover" />

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate shrink-0">
                        <Highlight text={displayName(p)} query={query} />
                      </span>

                      {(p.address_verified || (p.verified_links_count ?? 0) > 0) && (
                        <VerifiedBadge verified />
                      )}

                      <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                        /<Highlight text={fmtUsername(p)} query={query} />
                      </span>
                    </div>
                  </Command.Item>
                ))}

              </Command.List>
            </motion.div>
          )}
        </AnimatePresence>
      </Command>
    </div>
  );
}
