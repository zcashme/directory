"use client";

import { useEffect, useState, useCallback } from "react";
import { ThreadMessageWithProfile } from "@/lib/thread/types";
import MessageCard from "./MessageCard";

interface MessageFeedProps {
  initialMessages: ThreadMessageWithProfile[];
  onNewMessage?: (message: ThreadMessageWithProfile) => void;
}

const MESSAGES_PER_PAGE = 50;

export default function MessageFeed({
  initialMessages,
  onNewMessage,
}: MessageFeedProps) {
  const [messages, setMessages] = useState<ThreadMessageWithProfile[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= MESSAGES_PER_PAGE);
  const [offset, setOffset] = useState(MESSAGES_PER_PAGE);

  // Reload messages (for periodic updates)
  const reloadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/thread/messages?limit=${MESSAGES_PER_PAGE}&offset=0`);
      if (!response.ok) throw new Error("Failed to fetch messages");

      const { data, ok } = await response.json();
      if (ok && data) {
        setMessages(data);
        setHasMore(data.length >= MESSAGES_PER_PAGE);
        setOffset(MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("Error reloading messages:", error);
    }
  }, []);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/thread/messages?limit=${MESSAGES_PER_PAGE}&offset=${offset}`
      );
      if (!response.ok) throw new Error("Failed to fetch messages");

      const { data, ok } = await response.json();
      if (ok && Array.isArray(data)) {
        setMessages((prev) => [...prev, ...data]);
        setHasMore(data.length >= MESSAGES_PER_PAGE);
        setOffset((prev) => prev + MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, offset]);

  // Handle new message from parent
  useEffect(() => {
    if (onNewMessage) {
      // Reload on new message
      reloadMessages();
    }
  }, [onNewMessage, reloadMessages]);

  // Auto-reload messages periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      reloadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [reloadMessages]);

  // Handle scroll to bottom for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 500
      ) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  if (messages.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 text-lg">No messages yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
        <div className="py-8 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Load more messages
          </button>
        </div>
      )}

      {/* End of messages */}
      {!hasMore && messages.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">No more messages to load</p>
        </div>
      )}
    </div>
  );
}
