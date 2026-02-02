"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import AddUserForm from "@/ui/signup/AddUserForm";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import { buildSlug } from "@/lib/profile/normalizeSlugs";
import { supabase } from "@/lib/supabase/supabase-client";
import Image from "next/image";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const ref = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const q = debouncedQuery.trim();
    supabase
      .from("zcasher_searchable")
      .select("*")
      .or(`display_name.ilike.%${q}%,name.ilike.%${q}%,link_search_text.ilike.%${q}%,address.eq.${q}`)
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data || []);
          setOpen((data || []).length > 0);
        }
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) setOpen(true);
        }}
        placeholder="Search by name, address, or link..."
        autoComplete="off"
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-white/40 outline-none focus:border-white/40"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#0a1126]/80 bg-[#0a1126]/90 backdrop-blur-md shadow-xl">
          {results.slice(0, 20).map((p) => (
            <div
              key={p.id}
              onClick={() => {
                router.push(`/${buildSlug(p)}`);
                setOpen(false);
                setQuery("");
              }}
              className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 text-white font-semibold hover:bg-[#060b17]/95 transition-colors"
            >
              <ProfileAvatar profile={p} size={32} imageClassName="object-cover" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="truncate shrink-0">{p.display_name || p.name}</span>
                {(p.address_verified || p.zcasher_links?.some((l) => l.is_verified)) && (
                  <VerifiedBadge profile={p} />
                )}
                <span className="text-xs opacity-60 whitespace-nowrap truncate shrink-0 ml-auto">
                  @{p.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage({ featuredProfiles = [] }) {
  const router = useRouter();
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-16 gap-10">
      {/* Logo */}
      <div className="flex justify-center">
        <Image src={zcashMeLogo} alt="zcash.me" width={160} height={40} />
      </div>

      {/* Headline */}
      <h1 className="text-2xl font-light text-white text-center">
        Find anyone on Zcash
      </h1>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <SearchBar />
      </div>

      {/* Featured profiles */}
      {featuredProfiles.length > 0 && (
        <div className="max-w-lg w-full">
          <div className="text-white/50 text-xs uppercase tracking-widest mb-4 text-center">
            Featured
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {featuredProfiles.map((p) => (
              <button
                key={p.name}
                onClick={() => router.push(`/${buildSlug(p)}`)}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition"
              >
                <ProfileAvatar profile={p} size={48} />
                <span className="text-white text-xs truncate w-full text-center">
                  {p.display_name || p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Join button */}
      <button
        onClick={() => setShowJoin(true)}
        className="rounded-xl border border-white/20 px-6 py-2.5 text-sm text-white hover:bg-white/10 transition"
      >
        Join zcash.me
      </button>

      {/* AddUserForm modal */}
      {showJoin && (
        <AddUserForm isOpen={showJoin} onClose={() => setShowJoin(false)} />
      )}

      {/* Footer */}
      <footer className="text-xs text-white/40">
        <a href="/privacy" className="hover:text-white/60">Privacy</a>
        {" · "}
        <a href="/terms" className="hover:text-white/60">Terms</a>
      </footer>
    </div>
  );
}
