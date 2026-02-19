"use client";
import znsFlag from "../assets/zns-flag.png";

interface AnnouncementConfig {
  message: string;
  actionLabel: string;
  dismissLabel: string;
}

interface NsHeaderProps {
  showAnnouncement: boolean;
  announcementConfig: AnnouncementConfig;
  onDismissAnnouncement: () => void;
  search: string;
  onSearchChange: (_value: string) => void;
  loading: boolean;
  nsCount: number;
  onJoinClick: () => void;
}

export default function NsHeader({
  showAnnouncement,
  announcementConfig,
  onDismissAnnouncement,
  search,
  onSearchChange,
  loading,
  nsCount,
  onJoinClick,
}: NsHeaderProps) {
  return (
    <>
      {showAnnouncement && (
        <div className="fixed left-0 right-0 top-0 z-40 border-b border-gray-300 bg-[#f6b223] backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className="h-10">
              <div className="flex h-full flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                <span>{announcementConfig.message}</span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://luma.com/user/usr-ClRR7LI0lRpL5IW"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-gray-900 bg-white px-3 py-1 text-[10px] font-semibold transition-transform duration-150 hover:scale-[1.04] rounded-none"
                  >
                    {announcementConfig.actionLabel}
                  </a>
                  <button
                    type="button"
                    onClick={onDismissAnnouncement}
                    className="border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none"
                  >
                    {announcementConfig.dismissLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed left-0 right-0 z-30 border-b border-gray-300 bg-[#f7f7f2]/80 backdrop-blur ${
          showAnnouncement ? "top-10" : "top-0"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <img
                  src={typeof znsFlag === "string" ? znsFlag : znsFlag.src}
                  alt="ZNS flag"
                  className="h-5 w-auto"
                />
                <span className="text-base font-black">zcash.me/ns</span>
              </div>
              <div className="hidden w-full max-w-lg flex-1 items-center gap-2 md:flex">
                <label className="sr-only" htmlFor="directory-search">
                  Search profiles
                </label>
                <input
                  id="directory-search"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={
                    loading || nsCount <= 1 ? "Search" : `Search ${nsCount} names`
                  }
                  className="h-9 w-full border border-gray-900 bg-white px-3 text-sm focus:outline-hidden transition-transform duration-150 hover:scale-[1.01] rounded-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onJoinClick}
                  className="border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none"
                >
                  Add your name
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
