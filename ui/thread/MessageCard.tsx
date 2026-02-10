"use client";

import { formatDistanceToNow } from "date-fns";
import { ThreadMessageWithProfile } from "@/lib/thread/types";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import Link from "next/link";

interface MessageCardProps {
  message: ThreadMessageWithProfile;
}

export default function MessageCard({ message }: MessageCardProps) {
  const profile = message.profile;
  const createdDate = new Date(message.created_at);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  // Build profile link
  const profileLink = profile?.name ? `/${profile.name}` : null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white">
      {/* Header: Avatar, Name, and Verification Badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0">
          {profile ? (
            <Link href={profileLink || "#"} className="hover:opacity-80 transition-opacity">
              <ProfileAvatar profile={profile} size={40} />
            </Link>
          ) : (
            <ProfileAvatar profile={{}} size={40} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {profile && profileLink ? (
              <Link
                href={profileLink}
                className="font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors"
              >
                {profile.display_name || profile.name}
              </Link>
            ) : (
              <span className="font-semibold text-gray-900">
                {profile?.display_name || profile?.name || "Anonymous"}
              </span>
            )}

            {profile?.address_verified && <VerifiedBadge verified={true} />}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 mt-0.5">{timeAgo}</div>
        </div>
      </div>

      {/* Message Content */}
      <div className="pl-13 mb-2 text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
        {message.message_text}
      </div>

      {/* Footer: Blockchain verification indicator */}
      {message.verified_at && (
        <div className="flex items-center gap-1 text-xs text-green-700 mt-3 pl-13">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
          </svg>
          <span>Verified on blockchain</span>
        </div>
      )}
    </div>
  );
}
