'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThreadBoard } from '@/ui/thread/ThreadBoard';
import type { ThreadMessage, Board } from '@/lib/thread/types';
import {
  fetchBoardsAction,
  fetchMessagesAction,
  postMessageAction,
  createBoardAction,
} from '@/lib/thread/actions';

interface ThreadPageProps {
  initialMessages?: ThreadMessage[];
  initialBoards?: Board[];
  initialBoardId?: string;
}

export default function ThreadPage({
  initialMessages = [],
  initialBoards = [],
  initialBoardId = 'general',
}: ThreadPageProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [currentBoardId, setCurrentBoardId] = useState(initialBoardId);
  const [isLoadingInitial, setIsLoadingInitial] = useState(!initialBoards.length);
  const [messageOffset, setMessageOffset] = useState(0);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Initialize boards on mount
  useEffect(() => {
    const initializeBoards = async () => {
      try {
        if (boards.length === 0) {
          const result = await fetchBoardsAction();
          if (result.success && result.data) {
            setBoards(result.data);
            setThreadError(null);
          } else if (!result.success) {
            setThreadError(result.error ?? 'Failed to load boards');
          }
        }
      } catch {
        setThreadError('Failed to load boards');
      } finally {
        setIsLoadingInitial(false);
      }
    };

    initializeBoards();
  }, [boards.length]);

  // Load messages when board changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const result = await fetchMessagesAction(currentBoardId, 20, 0);
        if (result.success && result.data) {
          setMessages(result.data);
          setMessageOffset(0);
          setThreadError(null);
        } else if (!result.success) {
          setThreadError(result.error ?? 'Failed to load messages');
        }
      } catch {
        setThreadError('Failed to load messages');
      }
    };

    loadMessages();
  }, [currentBoardId]);

  const handlePostMessage = async (content: string, boardId: string) => {
    const result = await postMessageAction(content, boardId);
    if (result.success && result.data) {
      // Reload messages for the board
      const messagesResult = await fetchMessagesAction(boardId, 20, 0);
      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data);
        setMessageOffset(0);
        setThreadError(null);
      } else if (!messagesResult.success) {
        throw new Error(messagesResult.error ?? 'Failed to reload messages');
      }
    } else if (!result.success) {
      throw new Error(result.error ?? 'Failed to post message');
    }
  };

  const handleLoadMoreMessages = async (boardId: string) => {
    const nextOffset = messageOffset + 20;
    const result = await fetchMessagesAction(boardId, 20, nextOffset);
    if (result.success && result.data) {
      setMessages((prev) => [...prev, ...result.data]);
      setMessageOffset(nextOffset);
      setThreadError(null);
    } else if (!result.success) {
      throw new Error(result.error ?? 'Failed to load more messages');
    }
  };

  const handleCreateBoard = async (name: string, description: string) => {
    const result = await createBoardAction(name, description);
    if (result.success && result.data) {
      setBoards((prev) => [...prev, result.data]);
      setThreadError(null);
      // Auto-switch to new board via routing
      router.push(`/thread/${result.data.id}`);
    } else if (!result.success) {
      throw new Error(result.error ?? 'Failed to create board');
    }
  };

  const handleBoardSelect = (boardId: string) => {
    setCurrentBoardId(boardId);
    // Use router to update URL
    router.push(`/thread/${boardId}`);
  };

  if (isLoadingInitial) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {threadError && (
        <div className="mx-auto mt-4 w-full max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {threadError}
        </div>
      )}
      <ThreadBoard
        initialMessages={messages}
        initialBoards={boards}
        initialBoardId={currentBoardId}
        onPostMessage={handlePostMessage}
        onLoadMoreMessages={handleLoadMoreMessages}
        onCreateBoard={handleCreateBoard}
        onBoardSelect={handleBoardSelect}
      />
    </>
  );
}
