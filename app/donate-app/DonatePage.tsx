"use client";

import { useState, useMemo } from "react";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import CopyButton from "@/ui/common/buttons/CopyButton";
import MemoComposer from "@/ui/messaging/MemoComposer";
import InlineOtpForm from "@/ui/verification/InlineOtpForm";
import { useMessagingStore } from "@/lib/stores/messaging";
import type { Profile } from "@/lib/profile/types";
import { Button } from "@/ui/common";

// Mock donation recipient profile
const MOCK_RECIPIENT: Profile = {
  id: 99999,
  name: "zecdonations",
  display_name: "ZEC Donations",
  bio: "Support the Zcash community through donations",
  address: "u1mockaddressexampleforpreview123456789",
  address_verified: false,
  profile_image_url: undefined,
  nearest_city_name: undefined,
  country: undefined,
  iso2: undefined,
  links: [],
  verified_links_count: 0,
  is_ns: false,
  is_ns_core: false,
  is_ns_longterm: false,
  created_at: new Date().toISOString(),
};

interface Donation {
  id: string;
  amount: string;
  message: string;
  timestamp: Date;
  signed: boolean;
  signer?: {
    name: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function DonatePage() {
  const [showMemoComposer, setShowMemoComposer] = useState(false);
  const [showSignFlow, setShowSignFlow] = useState(false);
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const { setAmount, setMemo } = useMessagingStore();

  // Mock donations data
  const [donations] = useState<Donation[]>([
    {
      id: "1",
      amount: "1.234",
      message: "Great work on the privacy features! 🔒",
      timestamp: new Date(Date.now() - 3600000),
      signed: true,
      signer: {
        name: "alice",
        display_name: "Alice",
        avatar_url: undefined,
      },
    },
    {
      id: "2",
      amount: "0.500",
      message: "Keep building!",
      timestamp: new Date(Date.now() - 7200000),
      signed: false,
    },
  ]);

  const totalReceived = useMemo(() => {
    return donations.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(3);
  }, [donations]);

  const handleDonateClick = () => {
    setAmount("");
    setMemo("");
    setShowMemoComposer(true);
  };

  const handleSignDonation = (donationId: string) => {
    setSelectedDonationId(donationId);
    setShowSignFlow(true);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Profile Card - Donation Recipient */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 p-8 mb-6">
        {/* Header with Avatar */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <ProfileAvatar
              profile={MOCK_RECIPIENT}
              size={80}
              imageClassName="rounded-2xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {MOCK_RECIPIENT.display_name}
              </h1>
              <VerifiedBadge
                verified={MOCK_RECIPIENT.address_verified}
                verifiedLabel="Verified"
                unverifiedLabel="Not Verified"
              />
            </div>

            <p className="text-gray-600 text-md mb-1">@{MOCK_RECIPIENT.name}</p>

            {MOCK_RECIPIENT.bio && (
              <p className="text-gray-700 text-sm mt-3">{MOCK_RECIPIENT.bio}</p>
            )}
          </div>
        </div>

        {/* Address Row */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-6">
          <span className="text-xs text-gray-500 font-medium">ADDRESS</span>
          <code className="flex-1 text-xs text-gray-700 font-mono truncate">
            {MOCK_RECIPIENT.address}
          </code>
          <CopyButton
            text={MOCK_RECIPIENT.address}
            label="Copy"
            copiedLabel="Copied!"
            size="sm"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-1">Total Received (24h)</div>
            <div className="text-2xl font-bold text-gray-900">
              {totalReceived} <span className="text-lg text-gray-600">ZEC</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-1">Donations</div>
            <div className="text-2xl font-bold text-gray-900">{donations.length}</div>
          </div>
        </div>

        {/* Donate Button */}
        <Button
          onClick={handleDonateClick}
          variant="primary"
          size="lg"
          className="w-full py-4 shadow-md hover:shadow-lg"
        >
          💝 Send Donation
        </Button>
      </div>

      {/* Memo Composer - Appears when donate clicked */}
      {showMemoComposer && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Compose Donation</h2>
            <button
              onClick={() => setShowMemoComposer(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          <MemoComposer
            profile={MOCK_RECIPIENT}
            forceShowQR={true}
          />
        </div>
      )}

      {/* Donation Feed */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200/50 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Donations</h2>

        {donations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No donations yet. Be the first to donate!
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
              >
                {/* Donation Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {donation.signed && donation.signer ? (
                      <>
                        <ProfileAvatar
                          profile={{
                            profile_image_url: donation.signer.avatar_url,
                            name: donation.signer.name
                          } as Profile}
                          size={40}
                          imageClassName="rounded-full"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {donation.signer.display_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{donation.signer.name}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500">?</span>
                        </div>
                        <span className="text-gray-500 font-medium">Anonymous</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">
                      {donation.amount} ZEC
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(donation.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-gray-50 rounded-xl p-4 mb-3">
                  <p className="text-gray-700">{donation.message}</p>
                </div>

                {/* Sign Button for unsigned donations */}
                {!donation.signed && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSignDonation(donation.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      ✍️ Sign this donation
                    </button>
                    <span className="text-xs text-gray-400">
                      (prove you sent it)
                    </span>
                  </div>
                )}

                {/* OTP Form for signing */}
                {showSignFlow && selectedDonationId === donation.id && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-700 mb-3">
                      To sign this donation, you'll receive an OTP via Zcash transaction.
                      Enter it below once you receive it in your wallet.
                    </div>
                    <InlineOtpForm
                      profile={MOCK_RECIPIENT}
                      onSuccess={() => {
                        setShowSignFlow(false);
                        setSelectedDonationId(null);
                        alert("Donation signed successfully! (UI demo only)");
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This is a UI preview. Backend functionality not yet connected.</p>
      </div>
    </div>
  );
}
