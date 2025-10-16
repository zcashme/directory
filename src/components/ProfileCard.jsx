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

  // Derive trust states
  // Derive trust states (consistent with verified badge logic)
  const verifiedAddress = !!profile.address_verified;
  const totalLinks = profile.total_links ?? (profile.links?.length || 0); // ✅ fix added here
  const verifiedLinks =
    profile.verified_links_count ??
    (profile.links?.filter((l) => l.is_verified).length || 0);
  const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
  const hasUnverifiedLinks =
    (profile.total_links ?? profile.links?.length ?? 0) > 0 &&
    verifiedLinks === 0;

  const totalVerifications = (verifiedAddress ? 1 : 0) + verifiedLinks;

  // Use the unified logic for colors
  const isVerified = totalVerifications > 0;
  const hasReferrals = (profile.referral_count ?? 0) > 0;
const isRanked =
  hasReferrals &&
  profile.referral_rank &&
  profile.referral_rank > 0 &&
  profile.referral_rank <= 10;

  let circleClass = "bg-blue-400";
  if (isVerified && isRanked) {
    circleClass = "bg-gradient-to-b from-green-400 to-orange-400"; // vertical split
  } else if (isVerified) {
    circleClass = "bg-green-400";
  } else if (isRanked) {
    circleClass = "bg-orange-300";
  }
else if (hasReferrals) {
  circleClass = "bg-orange-300"; // could be softer orange for general referrers
}

  const CheckIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block w-3.5 h-3.5 text-green-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  if (!fullView) {
    // Compact directory card
    return (
      <VerifiedCardWrapper
        verifiedCount={profile.verified_links_count ?? 0}
        featured={profile.featured}
        onClick={() => {
          onSelect(profile.address);
          requestAnimationFrame(() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          );
        }}
        className="rounded-2xl p-3 border transition-all cursor-pointer shadow-sm backdrop-blur-sm border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)] mb-2"
      >
        <div className="flex items-center gap-4 w-full">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${circleClass}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-blue-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            />
          </div>

          <div className="flex flex-col flex-grow overflow-hidden min-w-0">
            <span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
              {profile.name}
              {profile.referral_rank > 0 && (
                <ReferRankBadge rank={profile.referral_rank} />
              )}
              {isNewProfile(profile) && (
                <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm">
                  NEW
                </span>
              )}
            </span>

            <span className="text-sm text-gray-500 truncate flex items-center gap-2">
              {profile.address_verified ||
              (profile.verified_links_count ?? 0) > 0 ? (
                <VerifiedBadge
                  verified={true}
                  verifiedCount={
                    (profile.verified_links_count ?? 0) +
                    (profile.address_verified ? 1 : 0)
                  }
                />
              ) : (
                <span className="text-red-400">Unverified</span>
              )}
              • Joined{" "}
              {new Date(profile.since).toLocaleString("default", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </VerifiedCardWrapper>
    );
  }

  // Full expanded vertical profile card
  return (
    <VerifiedCardWrapper
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
      featured={profile.featured}
      className="relative mx-auto mt-3 mb-8 p-6 animate-fadeIn text-center max-w-lg"
    >
      {/* Verified/Unverified badge in top-right corner */}
      <div className="absolute top-4 right-4">
        {profile.address_verified ||
        (profile.verified_links_count ?? 0) > 0 ? (
          <VerifiedBadge
            verified={true}
            verifiedCount={
              (profile.verified_links_count ?? 0) +
              (profile.address_verified ? 1 : 0)
            }
          />
        ) : (
          <VerifiedBadge verified={false} />
        )}
      </div>

      {/* Avatar */}
      <div
        className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-sm ${circleClass}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 text-blue-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        />
      </div>

      {/* Name */}
      <h2 className="mt-3 text-2xl font-bold text-gray-800">{profile.name}</h2>

      {/* Address */}
      <p className="mt-2 text-sm text-gray-600 font-mono select-all">
        {profile.address ? (
          <>
            {profile.address.slice(0, 10)}…{profile.address.slice(-10)}
          </>
        ) : (
          "—"
        )}
      </p>

      {/* Referrer badge */}
      <div className="mt-2 flex flex-col items-center justify-center gap-1">
        {profile.referral_rank > 0 && (
          <ReferRankBadge rank={profile.referral_rank} />
        )}
      </div>

      {/* Dates */}
      <p className="mt-3 text-xs text-gray-500">
        Joined{" "}
        {new Date(profile.since).toLocaleString("default", {
          month: "short",
          year: "numeric",
        })}{" "}
        • Last signed{" "}
        {profile.last_signed_at
          ? new Date(profile.last_signed_at).toLocaleString("default", {
              month: "short",
              year: "numeric",
            })
          : "NULL"}{" "}
        • Good thru{" "}
        {profile.good_thru
          ? new Date(profile.good_thru).toLocaleString("default", {
              month: "short",
              year: "numeric",
            })
          : "NULL"}
      </p>

      {/* Unified Action + Links Tray */}
      <div
        className={`relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-transparent/60 backdrop-blur-sm shadow-inner transition-all overflow-hidden mt-5 ${
          showLinks ? "pb-0" : ""
        }`}
      >
        {/* Action Buttons */}
        <div className="p-3 flex flex-wrap justify-center gap-3 border-b border-gray-200 w-full">
          <CopyButton text={profile.address} label="Copy Uaddr" />

          <button
            onClick={() => {
              setSelectedAddress(profile.address);
              setForceShowQR(true);
              setQRShown(true);
              setTimeout(() => {
                const el = document.getElementById("zcash-feedback");
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 1);
            }}
            className="flex items-center justify-center gap-1 border rounded-xl px-3 h-8 py-1.5 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
          >
            ▣ Show QR
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
            className="flex items-center justify-center gap-1 border rounded-xl px-3 py-1.5 h-8 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
          >
            𝇑  Share
          </button>
          <button
            onClick={() => setShowLinks(!showLinks)}
            className="flex items-center justify-center gap-1 border rounded-xl px-3 py-1.5 h-8 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
          >
            {showLinks ? "⎘ Hide Links" : "⌹ Show Links"}
          </button>
        </div>

        {/* Links Tray (visually attached to action tray) */}
        <div
          className={`w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden ${
            showLinks ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
            {profile.links && profile.links.length > 0 ? (
              profile.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-1 hover:text-blue-600 transition-colors"
                >
                  <span className="truncate flex items-center gap-2">
                    {link.label || link.url}
                    <VerifiedBadge verified={link.is_verified} />
                  </span>
                  <span className="text-gray-400 text-xs">⇱</span>
                </a>
              ))
            ) : (
              <p className="italic text-gray-500 text-center">
                No contributed links yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Centered Dynamic Warning */}
      {warning && (
        <div
          className={`mt-5 text-xs rounded-md px-4 py-2 border text-center mx-auto w-fit transition-colors duration-300 ${
            hasVerifiedContent
              ? "text-green-600 bg-green-50 border-green-200"
              : hasUnverifiedLinks
              ? "text-gray-800 bg-yellow-50 border-yellow-200"
              : "text-red-500 bg-red-50 border-red-200"
          }`}
        >
          {hasVerifiedContent ? (
            <>
              <span className="inline-flex items-center gap-1">
                {CheckIcon} {/* ✅ this is the fix */}
                <strong>{profile.name}</strong> appears to be verified.
              </span>
            </>
          ) : hasUnverifiedLinks ? (
            <>
              ⚠ <strong>{profile.name}</strong> has contributed links, but none
              are verified.
            </>
          ) : (
            <>
              ✖ <strong>{profile.name}</strong> may not be who you think.
            </>
          )}

          <button
            onClick={() => setShowDetail(!showDetail)}
            className={`ml-2 hover:underline text-xs font-semibold ${
              hasVerifiedContent
                ? "text-green-600"
                : hasUnverifiedLinks
                ? "text-gray-800"
                : "text-red-500"
            }`}
          >
            {showDetail ? "Hide" : "More"}
          </button>

          {showDetail && (
            <span
              className={`block mt-1 ${
                hasVerifiedContent
                  ? "text-green-600"
                  : hasUnverifiedLinks
                  ? "text-gray-800"
                  : "text-red-500"
              }`}
            >
              {profile.name} added {totalLinks} link
              {totalLinks !== 1 ? "s" : ""}, of which {verifiedLinks}{" "}
              {verifiedLinks === 1 ? "is" : "are"} verified.
            </span>
          )}
        </div>
      )}
    </VerifiedCardWrapper>
  );
}
