'use client';

import Image from 'next/image';
import { ThreadMessage } from '@/lib/thread/types';
import { formatDistanceToNow } from '@/lib/thread/utils';
import { Card, Badge } from '@/ui/common';

interface ThreadCardProps {
  message: ThreadMessage;
}

export function ThreadCard({ message }: ThreadCardProps) {
  const timestamp = formatDistanceToNow(new Date(message.created_at));

  return (
    <Card padding="md" shadow="sm" rounded="lg" className="mb-3">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          {message.profile_image_url ? (
            <Image
              src={message.profile_image_url}
              alt={message.username}
              width={40}
              height={40}
              className="rounded-full flex-shrink-0 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white">
                {message.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Username and Verified Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{message.username}</span>
            {message.verified && (
              <Badge variant="success" size="xs">
                ✓ Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{timestamp}</span>
      </div>

      {/* Body Section */}
      <div className="mb-0">
        <p className="text-sm leading-relaxed text-gray-900 break-words whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </Card>
  );
}
