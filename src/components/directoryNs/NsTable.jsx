import { useMemo } from "react";

import LoadingDots from "../LoadingDots";
import NsRow from "./NsRow";

export default function NsTable({
  loading,
  filteredProfiles,
  linksByProfileId,
  selectedAddress,
  setSelectedAddress,
  setDraftMemo,
  setActiveProfile,
  setForceShowQR,
  setUnverifiedLink,
}) {
  const rows = useMemo(
    () =>
      filteredProfiles.map((profile) => (
        <NsRow
          key={profile?.id ?? profile?.address}
          profile={profile}
          links={linksByProfileId[profile?.id] || []}
          selectedAddress={selectedAddress}
          onSelectAddress={setSelectedAddress}
          onSetDraftMemo={setDraftMemo}
          onOpenProfile={setActiveProfile}
          onForceShowQR={setForceShowQR}
          onUnverifiedLink={setUnverifiedLink}
        />
      )),
    [
      filteredProfiles,
      linksByProfileId,
      selectedAddress,
      setSelectedAddress,
      setDraftMemo,
      setActiveProfile,
      setForceShowQR,
      setUnverifiedLink,
    ]
  );

  return (
    <div className="mt-6">
      <div>
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-4 border border-gray-900 bg-white px-4 py-3 text-xs font-semibold tracking-wide transition-transform duration-150 hover:scale-[1.01] md:grid rounded-none">
          <div className="flex items-center">Name</div>
          <div className="flex items-center">Address</div>
          <div className="flex items-center">Last Verified</div>
          <div className="flex items-center">Nearest City</div>
          <div className="flex items-center">Social</div>
        </div>

        {loading && (
          <LoadingDots
            colors={["#000000", "#000000", "#000000", "#000000"]}
            className="py-10"
          />
        )}

        {!loading && filteredProfiles.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-600">No profiles found.</div>
        )}

        {!loading && rows}
      </div>
    </div>
  );
}
