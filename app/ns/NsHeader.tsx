"use client";
import { useState } from "react";
import Link from "next/link";
import znsFlag from "./assets/zns-flag.png";
import discordFavicon from "@/lib/profile/assets/favicons/favicon-discord-32.png";
import { nsLandingOrder, nsLandingPages } from "./nsLandingContent";

interface NsHeaderProps {
  onJoinClick: () => void;
}

export default function NsHeader({
  onJoinClick,
}: NsHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuLinks = [
    { href: "/ns", label: "Directory" },
    ...nsLandingOrder.map((slug) => ({
      href: `/ns/${slug}`,
      label: nsLandingPages[slug].eyebrow,
    })),
    {
      href: "https://discord.com/channels/900827411917201418/1454104981320892591",
      label: "Join the Discord",
      external: true,
      iconSrc: typeof discordFavicon === "string" ? discordFavicon : discordFavicon.src,
    },
  ];

  return (
    <div className="fixed left-0 right-0 top-0 z-30 border-b border-gray-300 bg-[#f7f7f2]/80 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide">
            <Link href="/ns" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <img
                src={typeof znsFlag === "string" ? znsFlag : znsFlag.src}
                alt="ZNS flag"
                className="h-5 w-auto"
              />
              <span className="text-base font-black">zcash.me/ns</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onJoinClick}
                className="hidden border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none sm:inline-flex"
              >
                Add your name
              </button>
              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center border border-gray-900 bg-white text-gray-900 transition-colors hover:bg-[#f6b223]"
              >
                <span className="flex flex-col gap-1">
                  <span
                    className={`block h-0.5 w-4 bg-current transition-transform ${
                      menuOpen ? "translate-y-1.5 rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-4 bg-current transition-opacity ${
                      menuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-4 bg-current transition-transform ${
                      menuOpen ? "-translate-y-1.5 -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="mt-3 border border-gray-900 bg-white">
              <div className="grid sm:grid-cols-2">
                {menuLinks.map((link, index) =>
                  link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900 transition-colors hover:bg-[#fff3cc] ${
                        index < menuLinks.length - 1 ? "border-b border-gray-200" : ""
                      } sm:border-b sm:border-gray-200`}
                    >
                      {link.iconSrc ? (
                        <img src={link.iconSrc} alt="" className="h-4 w-4" aria-hidden="true" />
                      ) : null}
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900 transition-colors hover:bg-[#fff3cc] ${
                        index < menuLinks.length - 1 ? "border-b border-gray-200" : ""
                      } sm:border-b sm:border-gray-200`}
                  >
                    {link.label}
                  </Link>
                )
                )}
              </div>
              <div className="border-t border-gray-900 p-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onJoinClick();
                  }}
                  className="w-full border border-gray-900 bg-gray-900 px-3 py-2 text-[10px] font-semibold uppercase text-white transition-transform duration-150 hover:scale-[1.01] rounded-none"
                >
                  Add your name
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
