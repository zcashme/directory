"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import AddUserForm from "@/ui/signup/AddUserForm";
import { buildSlug } from "@/lib/profile/normalizeSlugs";
import Image from "next/image";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";

export default function SplashPage({ profiles = [] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const handleSearchChange = (val) => {
    if (typeof val === "object" && val !== null) {
      router.push(`/${buildSlug(val.name)}`);
    } else {
      setSearch(val);
    }
  };

  const featuredProfiles = profiles.filter((p) => p.featured).slice(0, 8);

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
        <ProfileSearchDropdown
          value={search}
          onChange={handleSearchChange}
          profiles={profiles}
          placeholder="Search by name, address, or link..."
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-white/40 outline-none focus:border-white/40"
        />
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
                onClick={() => router.push(`/${buildSlug(p.name)}`)}
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
        <AddUserForm onClose={() => setShowJoin(false)} profiles={profiles} />
      )}

      {/* Footer */}
      <footer className="text-xs text-white/40">
        <a href="/privacy" className="hover:text-white/60">
          Privacy
        </a>
        {" · "}
        <a href="/terms" className="hover:text-white/60">
          Terms
        </a>
      </footer>
    </div>
  );
}
