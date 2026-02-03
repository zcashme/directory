"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";
import AddUserForm from "@/ui/signup/AddUserForm";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import useProfiles from "@/lib/directory/useProfiles";
import { buildSlug } from "@/lib/profile/normalizeSlugs";

export default function HomePage() {
  const router = useRouter();
  const { profiles } = useProfiles(null, true);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Get featured profiles (randomly selected)
  const featuredProfiles = useMemo(() => {
    const featured = profiles.filter((p) => p.featured);
    const source = featured.length > 0 ? featured : profiles;

    if (source.length === 0) return [];

    // Create a shuffled copy and take up to 6
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(6, shuffled.length));
  }, [profiles]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <Image
              src={zcashMeLogo}
              alt="Zcash.me"
              className="h-10 w-auto"
              width={150}
              height={40}
            />
            <button
              onClick={() => setIsJoinOpen(true)}
              className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold
                shadow-md transition-all duration-300 animate-joinPulse
                hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Join
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-lg mx-auto px-4 mb-8">
          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative bg-white rounded-2xl shadow-xl border border-green-100 p-6"
          >
            <div className="text-center">
              <h1 className="text-3xl font-black text-gray-900 mb-8 leading-tight">
                The easiest way
                <br />
                <span className="text-green-600">to Zcash you</span>
              </h1>

              {/* Search Bar */}
              <div className="w-full mx-auto relative">
                <div className="relative flex items-center bg-white rounded-full px-4 py-3 border border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/10 transition-all shadow-sm">
                  <span className="text-gray-400 font-medium text-sm mr-2">zcash.me/</span>
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSuppressDropdown(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const query = search.trim();
                        if (query) {
                          // Find exact match or first match
                          const exactMatch = profiles.find(
                            (p) => p.name?.toLowerCase() === query.toLowerCase() ||
                                   p.display_name?.toLowerCase() === query.toLowerCase()
                          );

                          if (exactMatch) {
                            const slug = buildSlug(exactMatch);
                            if (slug) {
                              window.location.href = `/${slug}`;
                            }
                          } else {
                            // Find first partial match
                            const firstMatch = profiles.find(
                              (p) => p.name?.toLowerCase().includes(query.toLowerCase()) ||
                                     p.display_name?.toLowerCase().includes(query.toLowerCase())
                            );

                            if (firstMatch) {
                              const slug = buildSlug(firstMatch);
                              if (slug) {
                                window.location.href = `/${slug}`;
                              }
                            }
                          }
                          setSuppressDropdown(true);
                        }
                      }
                    }}
                    placeholder="Search names"
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Dropdown */}
                {search && !suppressDropdown && (
                  <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-2 z-50">
                    <ProfileSearchDropdown
                      listOnly
                      value={search}
                      onChange={(v) => {
                        if (typeof v === "object") {
                          window.lastSelectionWasExplicit = true;
                          const slug = buildSlug(v);
                          if (slug) {
                            window.location.href = `/${slug}`;
                          }
                        } else {
                          setSearch(v);
                        }
                      }}
                      profiles={profiles}
                      placeholder="search"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Featured Profiles Section */}
        {featuredProfiles.length > 0 && (
          <div className="max-w-lg mx-auto mb-20 md:mb-32 px-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-3xl font-black text-gray-900 mb-8"
            >
              Featured Profiles
            </motion.h2>
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {featuredProfiles.map((profile, index) => {
                  const slug = buildSlug(profile);
                  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
                  return (
                    <motion.div
                      key={profile.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => slug && router.push(`/${slug}`)}
                      className="flex-shrink-0 w-32 cursor-pointer group"
                    >
                      <div className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center border border-gray-200 hover:border-green-300">
                        <div className="mb-3">
                          <ProfileAvatar profile={profile} size={56} />
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-semibold text-gray-900 text-sm truncate max-w-[100px]">
                            {profile.display_name || profile.name}
                          </span>
                          {isVerified && (
                            <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">@{profile.name}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* How it Works Section */}
        <div className="max-w-lg mx-auto mb-20 md:mb-32 px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-black text-gray-900 mb-12"
          >
            How it works
          </motion.h2>
          <div className="flex gap-4 md:gap-6">
            {[
              { number: "1", title: "Claim your username", description: "Choose a unique username and create your profile" },
              { number: "2", title: "Link your address", description: "Connect your Zcash address to receive payments" },
              { number: "3", title: "Receive payments", description: "Start receiving Zcash payments instantly and securely" },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center flex-1 min-w-0"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-black text-green-700">{step.number}</span>
                </div>
                <h3 className="text-xs md:text-base font-semibold text-gray-900">{step.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-center gap-6">
            <motion.a
              href="https://x.com/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </motion.a>
            <motion.a
              href="https://discord.gg/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.29-.444.67-.608 1.06a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.06.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </motion.a>
            <motion.a
              href="https://github.com/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.464-1.178-1.132-1.49-1.132-1.49-.927-.634.07-.622.07-.622 1.025.072 1.564 1.032 1.564 1.032.91 1.56 2.384 1.088 2.96.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </motion.a>
          </div>
        </div>
      </footer>

      {/* Join Modal */}
      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => setIsJoinOpen(false)}
      />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
