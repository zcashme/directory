"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import AddUserForm from "@/ui/signup/AddUserForm";
import { buildSlug } from "@/lib/profile/normalizeSlugs";
import Image from "next/image";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";

/* ───────── Debounce hook ───────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ───────── Main Component ───────── */
export default function HomePage({ featuredProfiles = [] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const dropdownRef = useRef(null);
  const debouncedSearch = useDebounce(search, 250);

  // Search
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) { setResults([]); setShowDropdown(false); return; }
    let cancelled = false;
    supabase
      .from("zcasher_searchable")
      .select("*")
      .or(`display_name.ilike.%${q}%,name.ilike.%${q}%,link_search_text.ilike.%${q}%,address.eq.${q}`)
      .limit(5)
      .then(({ data }) => {
        if (cancelled) return;
        setResults(data || []);
        setShowDropdown(true);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = search.trim().toLowerCase().replace(/^https?:\/\/(www\.)?[^/]+\/?/, "");
  const exactMatch = results.find((p) => p.name?.toLowerCase() === q);
  const showClaimRow = q && q.length >= 2 && !exactMatch;

  return (
    <div className="min-h-screen selection:bg-orange-200 bg-gray-50">

      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Image
          src={zcashMeLogo}
          alt="zcash.me"
          className="h-8 w-auto cursor-pointer"
          width={120}
          height={32}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
        <button
          onClick={() => setShowJoin(true)}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-full px-4 py-1.5 hover:bg-white/60 transition-colors"
        >
          Join
        </button>
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-24 max-w-4xl mx-auto text-center px-4">
        <div className="pt-16 pb-10 px-8 md:px-12 rounded-2xl border border-gray-200 bg-white/60">

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 font-serif tracking-tight leading-tight">
            The easiest way
            <br />
            to Zcash you
          </h1>
          <p className="text-gray-500 mb-8 text-base">
            Claim your name. Share your address. Get paid privately.
          </p>

          {/* Search bar */}
          <div ref={dropdownRef} className="max-w-lg mx-auto relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or claim a name"
                className="w-full pl-6 pr-12 py-4 rounded-2xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 font-medium placeholder:text-gray-300 text-center transition-colors"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => { if (search.trim()) setShowDropdown(true); }}
              />
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>

              {/* Dropdown */}
              {showDropdown && (results.length > 0 || showClaimRow) && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <div className="divide-y divide-gray-100">
                    {/* Claim row */}
                    {showClaimRow && (
                      <div
                        onClick={() => setShowJoin(true)}
                        className="group/item px-5 py-3.5 flex items-center justify-between hover:bg-pink-50/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-lg font-light">+</div>
                          <div className="text-left">
                            <div className="text-base font-medium text-gray-900">zcash.me/{q.replace(/\s+/g, "_")}</div>
                            <div className="text-xs text-pink-500">Available — claim it</div>
                          </div>
                        </div>
                        <span className="bg-pink-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm">Claim</span>
                      </div>
                    )}

                    {/* Profile results */}
                    {results.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { router.push(`/${buildSlug(p)}`); setShowDropdown(false); }}
                        className="group/item px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <ProfileAvatar profile={p} size={40} className="rounded-full shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <span className="truncate">{p.display_name || p.name}</span>
                            {(p.address_verified || p.verified) && <VerifiedBadge verified />}
                          </div>
                          <div className="text-xs text-gray-400 truncate">@{p.name}</div>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover/item:text-gray-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* CTA */}
          <button
            onClick={() => setShowJoin(true)}
            className="mt-8 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-md transition-all active:scale-95"
          >
            Claim your page
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7-7 7M5 12h16" /></svg>
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { step: "1", title: "Claim a name", desc: "Pick a username — it's free and instant." },
            { step: "2", title: "Add your address", desc: "Link your Zcash unified or shielded address." },
            { step: "3", title: "Share your link", desc: "Send anyone zcash.me/you to get paid." },
          ].map((s) => (
            <div key={s.step} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">{s.step}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-gray-500 py-6 px-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <Image src={zcashMeLogo} alt="zcash.me" className="h-6 w-auto opacity-60" width={80} height={24} />
          <div className="flex items-center gap-5">
            <a href="https://x.com/zcashme" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href="https://discord.gg/zcash" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600">Privacy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-gray-600">Terms</a>
            <span>·</span>
            <a href="/ns" className="hover:text-gray-600">Directory</a>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} zcash.me</p>
        </div>
      </footer>

      {/* Join modal */}
      {showJoin && <AddUserForm isOpen={showJoin} onClose={() => setShowJoin(false)} />}

    </div>
  );
}
