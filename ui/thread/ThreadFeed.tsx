'use client';

import { useEffect, useState, useRef } from 'react';
import { ThreadMessage } from '@/lib/thread/types';
import { ThreadCard } from './ThreadCard';

interface ThreadFeedProps {
  messages: ThreadMessage[];
  boardId?: string;
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
}

export function ThreadFeed({ messages, isLoading = false, onLoadMore }: ThreadFeedProps) {
  const [displayedMessages, setDisplayedMessages] = useState<ThreadMessage[]>(messages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreMessages = true; // TODO: Track pagination to determine if more messages exist

  // Update displayed messages when input changes
  useEffect(() => {
    setDisplayedMessages(messages);
  }, [messages]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMore && onLoadMore) {
          setIsLoadingMore(true);
          try {
            await onLoadMore();
          } catch (error) {
            console.error('Failed to load more messages:', error);
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-pulse text-gray-500">
          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (displayedMessages.length === 0) {
    return <div className="space-y-3" />;
  }

  return (
    <div className="space-y-3">
      {displayedMessages.map((message) => (
        <ThreadCard key={message.id} message={message} />
      ))}

      {/* Load more sentinel */}
      <div ref={sentinelRef} className="py-4" />

      {/* Loading indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>
      )}

      {!hasMoreMessages && displayedMessages.length > 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">
          No more messages
        </div>
      )}
    </div>
  );
}
