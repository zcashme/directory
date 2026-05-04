import { useState, useEffect, useRef, type CSSProperties, type RefObject } from "react";
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
import NetworkSchoolBadge from "@/ui/profile/NetworkSchoolBadge";
import { isTruthyProfileFlag } from "./profileCardUtils";

const fmtUsername = (p: Partial<Profile>) =>
  getUsernameWithDiscriminator(p).replace(/\s+/g, "_");

const displayName = (p: Partial<Profile>) =>
  p.display_name || p.name || "";
const NETWORK_STATE_HREF = "https://ns.com/zcashusersgroup/apply";
const ZCASH_NAMES_HREF = "https://zcashnames.com";

function isTruthyLikeMaxi(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

/** Highlight the first occurrence of `query` inside `text` (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold underline underline-offset-2">{text.slice(i, i + query.length)}</span>
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
  onClaimClick?: (username: string) => void; // eslint-disable-line no-unused-vars
  showUsernameAvailability?: boolean;
  className?: string;
  dropdownContainerRef?: RefObject<HTMLElement | null>;
}

export default function ProfileSearchDropdown({
  value,
  onChange,
  placeholder = "Search",
  onClaimClick,
  showUsernameAvailability = true,
  className = `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`,
  dropdownContainerRef,
}: ProfileSearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<string | null>(null);
  const [mobileDropdownStyle, setMobileDropdownStyle] = useState<CSSProperties | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // ------- Dismiss (click-outside + Escape) -------
  useEffect(() => {
    if (!show) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShow(false);
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [show]);

  const dropdownVisible = show && !!value?.trim();

  // On mobile, expand the dropdown to match the full header container width.
  useEffect(() => {
    if (!dropdownVisible) {
      setMobileDropdownStyle(undefined);
      return;
    }

    const updateDropdownPosition = () => {
      const anchorEl = containerRef.current;
      const fullWidthContainerEl = dropdownContainerRef?.current;
      if (!anchorEl || !fullWidthContainerEl || window.matchMedia("(min-width: 640px)").matches) {
        setMobileDropdownStyle(undefined);
        return;
      }

      const anchorRect = anchorEl.getBoundingClientRect();
      const fullWidthRect = fullWidthContainerEl.getBoundingClientRect();
      setMobileDropdownStyle({
        left: `${fullWidthRect.left - anchorRect.left}px`,
        width: `${fullWidthRect.width}px`,
      });
    };

    updateDropdownPosition();

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const onLayoutChange = () => updateDropdownPosition();
    window.addEventListener("resize", onLayoutChange);
    mediaQuery.addEventListener("change", onLayoutChange);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onLayoutChange);
    if (containerRef.current) resizeObserver?.observe(containerRef.current);
    if (dropdownContainerRef?.current) resizeObserver?.observe(dropdownContainerRef.current);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      mediaQuery.removeEventListener("change", onLayoutChange);
      resizeObserver?.disconnect();
    };
  }, [dropdownContainerRef, dropdownVisible]);

  return (
    <div ref={containerRef} className="relative">
      <Command shouldFilter={false}>
        <Command.Input
          value={value}
          onValueChange={(v) => {
            onChange(v);
            setShow(!!v?.trim());
          }}
          onFocus={() => {
            if (value?.trim()) setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          style={{
            outline: "none",
            height: "100%",
            margin: 0,
            boxSizing: "border-box",
            paddingTop: "15px",
            paddingBottom: "13px",
            lineHeight: "20px",
          }}
        />

        <AnimatePresence>
          {dropdownVisible && (
            <motion.div {...dropdownMotion}>
              <Command.List
                className="absolute left-0 top-full z-[1001] mt-1 max-h-60 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                style={mobileDropdownStyle}
              >

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

                {/* Empty state */}
                {!loading && results.length === 0 && !usernameAvailable && (
                  <div className="px-3 py-3 text-sm text-gray-400 text-center">No results</div>
                )}

                {/* Results */}
                {results.map((p) => {
                  const isMaxi = isTruthyLikeMaxi(p.is_maxi);
                  const isNs = isTruthyProfileFlag(p.is_ns);
                  return (
                    <Command.Item
                      key={`${p.name}-${p.id}`}
                      value={`profile-${p.id}`}
                      onSelect={() => { onChange(p); setShow(false); }}
                      className="group px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-gray-800 font-semibold transition-colors hover:bg-[var(--color-brand-blue)]/90 hover:text-white data-[selected=true]:bg-[var(--color-brand-blue)]/90 data-[selected=true]:text-white"
                    >
                      <ProfileAvatar profile={p} size={32} imageClassName="object-cover" />

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate">
                          <Highlight text={displayName(p)} query={query} />
                        </span>

                        {isNs && <NetworkSchoolBadge href={NETWORK_STATE_HREF} />}
                        {(p.address_verified || isMaxi) && (
                          <VerifiedBadge verified variant={isMaxi ? "zcashName" : "verified"} href={isMaxi ? ZCASH_NAMES_HREF : undefined} />
                        )}

                        <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                          /<Highlight text={fmtUsername(p)} query={query} />
                        </span>
                      </div>
                    </Command.Item>
                  );
                })}

              </Command.List>
            </motion.div>
          )}
        </AnimatePresence>
      </Command>
    </div>
  );
}
