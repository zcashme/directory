import { useState } from "react";
import isNewProfile from "../utils/isNewProfile";
import CopyButton from "./CopyButton";
import { useFeedback } from "../store";
import VerifiedBadge from "./VerifiedBadge";
import VerifiedCardWrapper from "./VerifiedCardWrapper";
import ReferRankBadge from "./ReferRankBadge";

export default function ProfileCard({ profile, onSelect, warning, fullView = false }) {
  const [showLinks, setShowLinks] = useState(false);
  const [qrShown, setQRShown] = useState(false);
  const [linksShown, setLinksShown] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const { setSelectedAddress, setForceShowQR } = useFeedback();

  if (!fullView) {
    // Compact directory card
    return (
      <VerifiedCardWrapper
        verifiedCount={profile.verified_count}
        onClick={() => {
          onSelect(profile.address);
          requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
        }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"></svg>
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
            {profile.name}



            {isNewProfile(profile) && (
              <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm">NEW</span>
            )}
          </span>

       <span className="text-sm text-gray-500 truncate flex items-center gap-2">
  { (profile.verified_count && profile.verified_count > 0) || profile.status_computed === "claimed" ? (
    <VerifiedBadge verified={true} verifiedCount={profile.verified_count || 1} />
  ) : (
    <span className="text-red-400">Unverified</span>
  )}
  • Joined {new Date(profile.since).toLocaleString("default", { month: "short", year: "numeric" })}
</span>


        </div>
      </VerifiedCardWrapper>
    );
  }

  // Full expanded profile view
  return (
    <VerifiedCardWrapper
      verifiedCount={profile.verified_count}
      className="mt-3 mb-8 p-6 animate-fadeIn text-center max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"></svg>
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
            <p className="text-sm text-gray-600 font-mono mt-1">
              {profile.address ? (
                <span className="select-all block flex items-center gap-2">
                  {profile.address.slice(0, 10)}…{profile.address.slice(-10)}
                  <VerifiedBadge verified={profile.verified_count > 0} verifiedCount={profile.verified_count} />
{profile.referral_rank && profile.referral_rank <= 10 && (
  <ReferRankBadge rank={profile.referral_rank} />
)}

                </span>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Dates */}
      <p className="text-xs text-gray-400 mb-4 text-left">
        Joined {new Date(profile.since).toLocaleString("default", { month: "short", year: "numeric" })} • Last signed{" "}
        {profile.last_signed_at ? new Date(profile.last_signed_at).toLocaleString("default", { month: "short", year: "numeric" }) : "NULL"} • Good thru{" "}
        {profile.good_thru ? new Date(profile.good_thru).toLocaleString("default", { month: "short", year: "numeric" }) : "NULL"}
      </p>



      {/* Buttons */}
{/* Unified Button Group */}
{/* Unified Action Zone */}
{/* Unified Action Zone with expanding links seamlessly connected */}
<div className="flex flex-col items-center mb-5 w-full max-w-md rounded-2xl border border-gray-200 bg-gray-50/40 hover:bg-gray-50/60 transition-colors shadow-sm overflow-hidden">
  {/* Buttons row */}
  <div className="p-3 flex flex-wrap justify-center gap-2 border-b border-gray-200">
    <CopyButton text={profile.address} label="Copy Uaddr" />

    <button
      onClick={() => {
        setSelectedAddress(profile.address);
        setForceShowQR(true);
        setQRShown(true);
        setTimeout(() => {
          const el = document.getElementById("zcash-feedback");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 1);
      }}
      className="flex items-center gap-1 border rounded-xl px-3 h-7 py-1.5 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-200"
    >
      ▣ Show QR
    </button>

    <button
      onClick={() => {
        setShowLinks(!showLinks);
        setLinksShown(true);
        setTimeout(() => setLinksShown(false), 1500);
      }}
      className="flex items-center gap-1 border rounded-xl px-3 py-1.5 h-7 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-200"
    >
      {showLinks ? "⌸ Hide Links" : "⌹ Show Links"}
    </button>

    <button
      onClick={() => {
        const shareUrl = `${window.location.origin}/${profile.name
          .normalize("NFKC")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")}`;
        if (navigator.share) {
          navigator
            .share({
              title: `${profile.name} on Zcash.me`,
              text: "Check out this Zcash profile:",
              url: shareUrl,
            })
            .catch(() => {});
        } else {
          navigator.clipboard.writeText(shareUrl);
        }
      }}
      className="flex items-center gap-1 border rounded-xl px-3 py-1.5 h-7 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 text-gray-500 group-hover:text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4m0 0L8 6m4-4v16"
        />
      </svg>
      Share
    </button>
  </div>

  {/* Expanding links (no visual gap) */}
  {showLinks && (
    <div className="w-full px-3 pt-3 pb-2 text-sm text-gray-700 animate-fadeIn bg-gray-50/40">
      <div className="flex flex-col gap-2">
        {profile.links && profile.links.length > 0 ? (
          profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-b border-gray-200 py-1 hover:text-blue-600 transition-colors"
            >
              <span className="truncate flex items-center gap-2">
                {link.label || link.url}
                <VerifiedBadge verified={link.is_verified} />
              </span>
              <span className="text-gray-400 text-xs">⇱</span>
            </a>
          ))
        ) : (
          <p className="italic text-gray-500">No contributed links yet.</p>
        )}
      </div>
    </div>
  )}
</div>


      {/* Warning */}
      {warning && (
        <div className="mt-4 text-xs text-red-400 bg-red-50 border border-red-200 rounded-md px-3 py-1 text-left">
          ⚠ <strong>{profile.name}</strong> may not be who you think.
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="ml-2 text-blue-600 hover:underline text-xs font-semibold"
          >
            {showDetail ? "Hide" : "More"}
          </button>
          {showDetail && (
            <span className="block mt-1 text-red-400">
              {profile.name} added 0 links of which 0 are verified.
            </span>
          )}
        </div>
      )}
    </VerifiedCardWrapper>
  );
}
